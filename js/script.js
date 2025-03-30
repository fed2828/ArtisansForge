document.addEventListener("DOMContentLoaded", () => {
    const fileUpload = document.getElementById("fileUpload");
    const calculatePriceBtn = document.getElementById("calculatePriceBtn");
    const calculatedVolumeDiv = document.getElementById("calculatedVolume");
    const calculatedPriceDiv = document.getElementById("calculatedPrice");
  
    // Esempio: costi materiali (€/cm³)
    const materialCosts = {
      "FDM_PLA": 0.10,        // 0.10 €/cm³
      "FDM_ABS": 0.12,
      "RESINA_STD": 0.25
    };
  
    // Calcolo volume di un file STL (ASCII o BINARIO). Restituisce mm^3.
    // 1) Verifica se è binario o ASCII
    // 2) Parsea di conseguenza e somma i volumi dei triangoli.
    async function parseSTLVolume(file) {
      // Leggiamo il file come ArrayBuffer (per poter controllare intestazione e, se serve, parse binario).
      const arrayBuffer = await file.arrayBuffer();
      // Se è binario, parse binario. Altrimenti parse ASCII.
      if (isBinarySTL(arrayBuffer)) {
        return parseBinarySTL(arrayBuffer);
      } else {
        // ASCII: convertiamo l'ArrayBuffer in testo e poi parse
        const decoder = new TextDecoder();
        const stlText = decoder.decode(arrayBuffer);
        return parseASCIISTL(stlText);
      }
    }
  
    // Controllo se un STL è binario tramite:
    // - Lettura n. triangoli a offset 80 (uint32)
    // - Verifica che dimensioni file coincidano con 84 + (50 * nTriangles)
    function isBinarySTL(arrayBuffer) {
      if (arrayBuffer.byteLength < 84) {
        // Troppo piccolo per essere un binario STL valido
        return false;
      }
      const dataView = new DataView(arrayBuffer);
      // Numero di triangoli memorizzato in little-endian a offset 80
      const nFaces = dataView.getUint32(80, true);
      const expectedSize = 84 + nFaces * 50;
      // Se combacia, presumiamo che sia binario
      return (expectedSize === arrayBuffer.byteLength);
    }
  
    // Parsing BINARIO: volume in mm^3
    function parseBinarySTL(arrayBuffer) {
      const dataView = new DataView(arrayBuffer);
      let pos = 0;
      // Skip 80 byte header
      pos += 80;
      // Leggi numero triangoli
      const nFaces = dataView.getUint32(pos, true);
      pos += 4;
  
      let totalVolume = 0;
      for (let i = 0; i < nFaces; i++) {
        // Saltiamo la normale (12 byte)
        pos += 12;
  
        // Leggiamo i tre vertici (3 x 12 byte = 36)
        const v1 = readVector3(dataView, pos); 
        pos += 12;
        const v2 = readVector3(dataView, pos); 
        pos += 12;
        const v3 = readVector3(dataView, pos); 
        pos += 12;
  
        // Saltiamo i 2 byte "attribute byte count"
        pos += 2;
  
        totalVolume += triangleVolume(v1, v2, v3);
      }
      return Math.abs(totalVolume);
    }
  
    function readVector3(dataView, offset) {
      // Coord in float32 (little-endian)
      const x = dataView.getFloat32(offset, true);
      const y = dataView.getFloat32(offset + 4, true);
      const z = dataView.getFloat32(offset + 8, true);
      return [x, y, z];
    }
  
    // Parsing ASCII: volume in mm^3
    function parseASCIISTL(stlText) {
      // Cerchiamo i "vertex x y z"
      // Esempio di riga: "vertex 1.0 2.0 3.0"
      const vertexRegex = /vertex\s+([\-\d\.eE]+)\s+([\-\d\.eE]+)\s+([\-\d\.eE]+)/g;
      let match;
      const vertices = [];
  
      while ((match = vertexRegex.exec(stlText)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const z = parseFloat(match[3]);
        vertices.push([x, y, z]);
      }
  
      let totalVolume = 0;
      // Ogni 3 vertici = un triangolo
      for (let i = 0; i < vertices.length; i += 3) {
        const v1 = vertices[i];
        const v2 = vertices[i + 1];
        const v3 = vertices[i + 2];
        totalVolume += triangleVolume(v1, v2, v3);
      }
      return Math.abs(totalVolume);
    }
  
    // Calcolo volume di un triangolo via formula tetraedrica
    // Volume(tetraedro) = (1/6) * | v1 ⋅ ((v2−v1) × (v3−v1)) |
    function triangleVolume(v1, v2, v3) {
      // v2 - v1
      const ax = v2[0] - v1[0];
      const ay = v2[1] - v1[1];
      const az = v2[2] - v1[2];
  
      // v3 - v1
      const bx = v3[0] - v1[0];
      const by = v3[1] - v1[1];
      const bz = v3[2] - v1[2];
  
      // Prodotto vettoriale (ax,ay,az) x (bx,by,bz)
      const cx = ay * bz - az * by;
      const cy = az * bx - ax * bz;
      const cz = ax * by - ay * bx;
  
      // Prodotto scalare con v1: v1[0]*cx + v1[1]*cy + v1[2]*cz
      // Ma attenzione: la formula classica è "v1 ⋅ ( (v2−v1) × (v3−v1) ) / 6"
      // Se i vertici non sono riferiti all'origine, spesso si sposta uno dei vertici all'origine,
      // ma la formula funziona ugualmente se la mesh è manifold.
      const dot = (v1[0] * cx) + (v1[1] * cy) + (v1[2] * cz);
      return dot / 6.0;
    }
  
    // Quando clicco "Calcola Volume & Prezzo"
    calculatePriceBtn.addEventListener("click", async () => {
      const file = fileUpload.files[0];
      if (!file) {
        alert("Seleziona prima un file STL!");
        return;
      }
  
      try {
        // 1) Calcoliamo volume in mm^3
        const volumeMM3 = await parseSTLVolume(file);
  
        // 2) Convertiamo in cm^3 (1 cm³ = 1000 mm³)
        const volumeCM3 = volumeMM3 / 1000;
  
        calculatedVolumeDiv.textContent = `Volume: ${volumeCM3.toFixed(2)} cm³`;
  
        // 3) Recuperiamo materiale e quantità
        const material = document.getElementById("materialSelect").value;
        const quantity = parseInt(document.getElementById("quantity").value) || 1;
  
        // 4) Calcolo costo al cm³
        const costPerCM3 = materialCosts[material] || 0.10;
        let totalCost = volumeCM3 * costPerCM3 * quantity;
  
        // (Facoltativo) Aggiungiamo un costo fisso di setup
        const setupFee = 2.00;
        totalCost += setupFee;
  
        // 5) Mostriamo il prezzo finale
        calculatedPriceDiv.textContent = `Prezzo stimato: €${totalCost.toFixed(2)}`;
      } catch (err) {
        console.error(err);
        alert("Errore durante l'analisi del file STL: " + err.message);
      }
    });
  });
  