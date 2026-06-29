package com.timurlenk.turkchess;

import android.content.res.Configuration;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updateStatusBarForOrientation();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        updateStatusBarForOrientation();
    }

    @Override
    public void onResume() {
        super.onResume();
        updateStatusBarForOrientation();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            updateStatusBarForOrientation();
        }
    }

    private void updateStatusBarForOrientation() {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
        boolean isLandscape = getResources().getConfiguration().orientation
            == Configuration.ORIENTATION_LANDSCAPE;

        if (isLandscape) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars());
        }
    }
}
