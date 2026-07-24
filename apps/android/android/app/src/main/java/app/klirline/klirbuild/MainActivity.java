package app.klirline.klirbuild;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Edge-to-edge fullscreen: web content draws under system bars; CSS safe-area pads UI.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

    View decor = getWindow().getDecorView();
    WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), decor);
    if (insets != null) {
      insets.setAppearanceLightStatusBars(false);
      insets.setAppearanceLightNavigationBars(false);
    }
  }
}
