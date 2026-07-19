package expo.modules.focutimeblocker

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView

/**
 * Overlay service that shows a "Stay Focused" overlay during a focus session.
 * This overlay covers the screen to discourage app switching and provides
 * a timer and motivation.
 */
class FocuTimeOverlayService : Service() {

  private lateinit var windowManager: WindowManager
  private var overlayView: View? = null
  private var isVisible = false

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val durationMinutes = intent?.getIntExtra("duration_minutes", 25) ?: 25

    if (!isVisible) {
      showOverlay(durationMinutes)
    }

    return START_STICKY
  }

  private fun showOverlay(durationMinutes: Int) {
    val inflater = getSystemService(Context.LAYOUT_INFLATER_SERVICE) as LayoutInflater
    overlayView = inflater.inflate(
      resources.getIdentifier(
        "overlay_focus",
        "layout",
        packageName
      ),
      null
    )

    // Update timer text
    val timerText = overlayView?.findViewById<TextView>(
      resources.getIdentifier("overlay_timer", "id", packageName)
    )
    timerText?.text = "$durationMinutes min"

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        WindowManager.LayoutParams.TYPE_PHONE,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      PixelFormat.TRANSLUCENT
    )

    params.gravity = Gravity.TOP or Gravity.START

    try {
      windowManager.addView(overlayView, params)
      isVisible = true
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onDestroy() {
    super.onDestroy()
    if (isVisible && overlayView != null) {
      try {
        windowManager.removeView(overlayView)
      } catch (e: Exception) {
        e.printStackTrace()
      }
      isVisible = false
      overlayView = null
    }
  }
}