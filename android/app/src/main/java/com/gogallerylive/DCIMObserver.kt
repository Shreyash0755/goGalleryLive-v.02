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

        val isRelevantEvent = event == 8 ||   // CREATE
                              event == 16 ||  // CLOSE_WRITE
                              event == 32     // MOVED_TO

        if (!isRelevantEvent) return
        if (processedFiles.contains(fileName)) return
        if (processingFiles.contains(fileName)) return

        processingFiles.add(fileName)
        val fullPath = "$path/$fileName"

        Thread {
            try {
                // Wait for file to finish writing
                Thread.sleep(3000)

                val file = File(fullPath)

                if (!file.exists()) {
                    processingFiles.remove(fileName)
                    return@Thread
                }

                // Check file size
                if (file.length() < 10000) {
                    processingFiles.remove(fileName)
                    Log.d("DCIMObserver", "File too small, skipping: $fileName")
                    return@Thread
                }

                // KEY FIX: Only process photos taken in last 30 seconds
                val fileAge = System.currentTimeMillis() - file.lastModified()
                Log.d("DCIMObserver", "File age: ${fileAge}ms, file: $fileName")

                if (fileAge > 30000) {
                    processingFiles.remove(fileName)
                    Log.d("DCIMObserver", "File too old, skipping: $fileName")
                    return@Thread
                }

                processedFiles.add(fileName)
                processingFiles.remove(fileName)
                Log.d("DCIMObserver", "✅ Valid new photo: $fullPath")
                onNewPhoto(fullPath)

                // Clean up after 5 minutes
                Thread.sleep(300000)
                processedFiles.remove(fileName)

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