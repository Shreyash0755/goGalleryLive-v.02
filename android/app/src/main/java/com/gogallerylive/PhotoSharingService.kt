package com.gogallerylive

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Environment
import android.os.IBinder
import android.util.Log
import java.io.File

class PhotoSharingService : Service() {

    private val observers = mutableListOf<DCIMObserver>()
    private val TAG = "PhotoSharingService"

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        startForeground(NOTIFICATION_ID, buildNotification())
        startWatchingAllPaths()
        return START_STICKY
    }

    private fun startWatchingAllPaths() {
        // Watch multiple possible camera paths
        val possiblePaths = listOf(
            Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DCIM
            ).absolutePath + "/Camera",

            Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DCIM
            ).absolutePath,

            Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_PICTURES
            ).absolutePath,

            "/storage/emulated/0/DCIM/Camera",
            "/storage/emulated/0/DCIM",
            "/storage/emulated/0/Pictures",
        )

        for (path in possiblePaths) {
            val dir = File(path)
            if (dir.exists() && dir.isDirectory) {
                Log.d(TAG, "Watching path: $path")
                val observer = DCIMObserver(path) { photoPath ->
                    Log.d(TAG, "Photo detected at: $photoPath")
                    PhotoDetectionModule.sendNewPhotoEvent(photoPath)
                }
                observer.startWatching()
                observers.add(observer)
            } else {
                Log.d(TAG, "Path does not exist: $path")
            }
        }

        Log.d(TAG, "Total paths being watched: ${observers.size}")
    }

    private fun buildNotification(): Notification {
        val channelId = "photo_sharing_channel"
        val channel = NotificationChannel(
            channelId,
            "GoGalleryLive",
            NotificationManager.IMPORTANCE_LOW
        )
        getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)

        return Notification.Builder(this, channelId)
            .setContentTitle("GoGalleryLive Active")
            .setContentText("Auto sharing is enabled")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        Log.d(TAG, "Service destroyed")
        observers.forEach { it.stopWatching() }
        observers.clear()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIFICATION_ID = 1001
    }
}