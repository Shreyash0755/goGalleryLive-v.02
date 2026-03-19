package com.gogallerylive

import android.os.FileObserver
import android.util.Log
import java.io.File

class DCIMObserver(
    private val path: String,
    private val onNewPhoto: (String) -> Unit
) : FileObserver(path, ALL_EVENTS) {

    private val processedFiles = mutableSetOf<String>()
    private val processingFiles = mutableSetOf<String>()

    override fun onEvent(event: Int, fileName: String?) {
        if (fileName == null) return
        if (!isImageFile(fileName)) return

        // Only handle CLOSE_WRITE and MOVED_TO
        val isRelevantEvent = event == 8 ||   // CREATE
                              event == 16 ||  // CLOSE_WRITE
                              event == 32     // MOVED_TO

        if (!isRelevantEvent) return

        // Skip if already processed or currently processing
        if (processedFiles.contains(fileName)) return
        if (processingFiles.contains(fileName)) return

        Log.d("DCIMObserver", "Processing: $fileName event: $event")
        processingFiles.add(fileName)

        val fullPath = "$path/$fileName"

        Thread {
            try {
                Thread.sleep(2000)

                val file = File(fullPath)
                if (file.exists() && file.length() > 10000) {
                    processedFiles.add(fileName)
                    processingFiles.remove(fileName)
                    Log.d("DCIMObserver", "✅ Sending photo: $fullPath")
                    onNewPhoto(fullPath)

                    // Remove from processed after 5 minutes
                    Thread.sleep(300000)
                    processedFiles.remove(fileName)
                } else {
                    processingFiles.remove(fileName)
                    Log.d("DCIMObserver", "❌ File invalid: ${file.length()} bytes")
                }
            } catch (e: Exception) {
                processingFiles.remove(fileName)
                Log.e("DCIMObserver", "Error: ${e.message}")
            }
        }.start()
    }

    private fun isImageFile(fileName: String): Boolean {
        val lower = fileName.lowercase()
        return lower.endsWith(".jpg") ||
               lower.endsWith(".jpeg") ||
               lower.endsWith(".png") ||
               lower.endsWith(".heic") ||
               lower.endsWith(".webp")
    }
}