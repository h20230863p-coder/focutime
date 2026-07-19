package expo.modules.focutimeblocker

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent

/**
 * AccessibilityService that monitors app switches during a focus session.
 *
 * When the user opens a blocked app (e.g., Instagram, TikTok),
 * this service intercepts the event and shows a full-screen overlay
 * reminding them to return to FocuTime.
 */
class FocuTimeAccessibilityService : AccessibilityService() {

  companion object {
    private var instance: FocuTimeAccessibilityService? = null

    fun isRunning(): Boolean = instance != null

    fun getInstance(): FocuTimeAccessibilityService? = instance
  }

  private val prefs: SharedPreferences by lazy {
    getSharedPreferences("focutime_blocker", Context.MODE_PRIVATE)
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this

    val info = AccessibilityServiceInfo().apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
        AccessibilityEvent.TYPE_PACKAGE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_VISUAL
      notificationTimeout = 100
      flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
    }
    serviceInfo = info
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    val blockedApps = prefs.getStringSet("blocked_apps", emptySet()) ?: emptySet()
    val blockUntil = prefs.getLong("block_until", 0L)

    // Check if blocking is active
    if (blockUntil < System.currentTimeMillis() || blockedApps.isEmpty()) {
      return
    }

    // When window state changes, check the package name
    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      val packageName = event.packageName?.toString() ?: return

      // Ignore our own app and system UI
      if (packageName == applicationContext.packageName ||
        packageName == "com.android.systemui" ||
        packageName == "com.google.android.apps.nexuslauncher"
      ) {
        return
      }

      // Check if the launched app is in our blocked list
      if (blockedApps.any { packageName.contains(it, ignoreCase = true) }) {
        // App blocked! Show the overlay
        showBlockedAppOverlay(packageName)
      }
    }
  }

  private fun showBlockedAppOverlay(packageName: String) {
    val intent = Intent(this, BlockedAppActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      putExtra("blocked_package", packageName)
    }
    startActivity(intent)
  }

  override fun onInterrupt() {
    // Service interrupted
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
  }
}