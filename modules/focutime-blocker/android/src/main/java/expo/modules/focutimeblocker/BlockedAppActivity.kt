package expo.modules.focutimeblocker

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

/**
 * Full-screen activity shown when the user tries to open a blocked app.
 * Displays a message and gives them the option to return to FocuTime.
 */
class BlockedAppActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val blockedPackage = intent.getStringExtra("blocked_package") ?: "unknown app"

    // Create a simple layout programmatically since we're in a module
    val layoutId = resources.getIdentifier(
      "activity_blocked",
      "layout",
      packageName
    )

    if (layoutId != 0) {
      setContentView(layoutId)
    } else {
      // Fallback: create a simple view
      setContentView(createSimpleBlockedView(blockedPackage))
    }
  }

  private fun createSimpleBlockedView(blockedPackage: String): android.widget.LinearLayout {
    val layout = android.widget.LinearLayout(this).apply {
      orientation = android.widget.LinearLayout.VERTICAL
      gravity = android.view.Gravity.CENTER
      setPadding(32, 32, 32, 32)
      setBackgroundColor(0xFF1A237E.toInt()) // Deep blue
    }

    val emoji = android.widget.TextView(this).apply {
      text = "🚫"
      textSize = 64f
      gravity = android.view.Gravity.CENTER
    }

    val title = android.widget.TextView(this).apply {
      text = "Stay Focused!"
      textSize = 28f
      textAlignment = android.view.View.TEXT_ALIGNMENT_CENTER
      setTextColor(0xFFFFFFFF.toInt())
      typeface = android.graphics.Typeface.DEFAULT_BOLD
      setPadding(0, 24, 0, 8)
    }

    val message = android.widget.TextView(this).apply {
      text = "You're in a focus session.\n$blockedPackage is blocked right now."
      textSize = 16f
      textAlignment = android.view.View.TEXT_ALIGNMENT_CENTER
      setTextColor(0xFFB0BEC5.toInt())
      setPadding(0, 0, 0, 24)
    }

    val returnButton = android.widget.Button(this).apply {
      text = "⬅ Return to FocuTime"
      setTextColor(0xFFFFFFFF.toInt())
      setBackgroundColor(0xFFFF6F00.toInt())
      textSize = 16f
      setOnClickListener {
        // Go back to the FocuTime app
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent != null) {
          startActivity(launchIntent)
        }
        finish()
      }
    }

    val dismissButton = android.widget.Button(this).apply {
      text = "Dismiss & Quit Session"
      setTextColor(0x80FFFFFF.toInt())
      setBackgroundColor(0x00000000.toInt())
      textSize = 14f
      setOnClickListener {
        finish()
      }
    }

    layout.addView(emoji)
    layout.addView(title)
    layout.addView(message)
    layout.addView(returnButton)
    layout.addView(dismissButton)

    return layout
  }
}