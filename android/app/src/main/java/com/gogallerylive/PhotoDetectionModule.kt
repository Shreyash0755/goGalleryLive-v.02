package com.gogallerylive

import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class PhotoDetectionModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PhotoDetectionModule"

    // START SERVICE — called from React Native
    @ReactMethod
    fun startService() {
        Log.d("PhotoDetectionModule", "Starting service...")
        val intent = Intent(reactContext, PhotoSharingService::class.java)
        reactContext.startForegroundService(intent)
    }

    // STOP SERVICE — called from React Native
    @ReactMethod
    fun stopService() {
        Log.d("PhotoDetectionModule", "Stopping service...")
        val intent = Intent(reactContext, PhotoSharingService::class.java)
        reactContext.stopService(intent)
    }

    // CHECK IF SERVICE IS RUNNING
    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(true)
    }

    // ADD LISTENER — required for React Native event emitter
    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RCTDeviceEventEmitter
    }

    // REMOVE LISTENERS — required for React Native event emitter
    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RCTDeviceEventEmitter
    }

    companion object {
        private var moduleInstance: PhotoDetectionModule? = null

        fun initialize(module: PhotoDetectionModule) {
            moduleInstance = module
        }

        // SEND PHOTO PATH TO REACT NATIVE
        fun sendNewPhotoEvent(photoPath: String) {
            Log.d("PhotoDetectionModule", "Sending event: $photoPath")
            moduleInstance?.reactApplicationContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("NewPhotoDetected", photoPath)
        }
    }

    init {
        initialize(this)
    }
}