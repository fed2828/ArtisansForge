<?php
// Verifica se è stato ricevuto un file
if(isset($_FILES['file'])) {
    $file = $_FILES['file'];

    // Percorso di destinazione per il salvataggio del file
    $targetDirectory = 'upload/'; // Imposta la directory di destinazione desiderata

    // Crea la directory di destinazione se non esiste
    if (!file_exists($targetDirectory)) {
        mkdir($targetDirectory, 0777, true);
    }

    // Genera un nome univoco per il file
    $fileName = uniqid() . '_' . $file['name'];

    // Percorso completo del file di destinazione
    $targetPath = $targetDirectory . $fileName;

    // Sposta il file temporaneo alla posizione di destinazione
    if(move_uploaded_file($file['tmp_name'], $targetPath)) {
        // Il file è stato salvato con successo
        echo 'File salvato con successo!';
    } else {
        // Si è verificato un errore nel salvataggio del file
        echo 'Errore nel salvataggio del file.';
    }
} else {
    // Nessun file ricevuto
    echo 'Nessun file ricevuto.';
}
?>
