package com.freshmindvideo.app;

import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private WindowInsetsControllerCompat insetsController;
    private boolean screenReceiverRegistered = false;
    private final BroadcastReceiver screenOffReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent != null && Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                pausarReproductorWebView();
            }
        }
    };

    private static final String[] AD_DOMAINS = new String[] {
        "doubleclick.net",
        "googlesyndication.com",
        "googleadservices.com",
        "2mdn.net",
        "imasdk.googleapis.com",
        "google-analytics.com",
        "analytics.google.com"
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FMVScreenOrientationPlugin.class);
        super.onCreate(savedInstanceState);
        configurarContencionWebView();
        insetsController = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
        hideSystemUi();
        registrarReceptorBloqueoPantalla();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("¿Quieres salir?")
                    .setMessage("¿Estás seguro de que quieres cerrar FreshMindVideo?")
                    .setNegativeButton("Seguir aquí", (dialog, which) -> dialog.dismiss())
                    .setPositiveButton("Salir", (dialog, which) -> finish())
                    .show();
            }
        });
    }

    private void configurarContencionWebView() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }
        WebView webView = this.bridge.getWebView();
        WebSettings settings = webView.getSettings();
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        final String localUrl = this.bridge.getLocalUrl();
        final Uri localUri = localUrl != null ? Uri.parse(localUrl) : null;

        this.bridge.setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null || request.getUrl() == null) {
                    return true;
                }
                Uri url = request.getUrl();
                String scheme = url.getScheme() != null ? url.getScheme().toLowerCase(Locale.ROOT) : "";
                if ("data".equals(scheme) || "blob".equals(scheme)) {
                    return false;
                }
                if (localUri != null
                    && scheme.equalsIgnoreCase(localUri.getScheme())
                    && url.getHost() != null
                    && url.getHost().equalsIgnoreCase(localUri.getHost())) {
                    return false;
                }
                if (!request.isForMainFrame() && esIframeYoutubePermitido(url)) {
                    return false;
                }
                // Bloquea cualquier salida hacia la app de YouTube, Chrome o navegadores externos
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse localResp = super.shouldInterceptRequest(view, request);
                if (localResp != null) {
                    return localResp;
                }
                if (request != null && request.getUrl() != null && esSolicitudPublicidad(request.getUrl())) {
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }
        });
    }

    private static boolean esIframeYoutubePermitido(Uri url) {
        String host = url.getHost();
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        String path = url.getPath() != null ? url.getPath() : "";
        return ("www.youtube.com".equals(h) || "www.youtube-nocookie.com".equals(h))
            && path.startsWith("/embed/");
    }

    private static boolean esSolicitudPublicidad(Uri url) {
        String host = url.getHost();
        if (host == null) return false;
        String h = host.toLowerCase(Locale.ROOT);
        if (h.startsWith("adservice.google.")) {
            return true;
        }
        for (String domain : AD_DOMAINS) {
            if (h.equals(domain) || h.endsWith("." + domain)) {
                return true;
            }
        }
        if ("www.youtube.com".equals(h)
            || "youtube.com".equals(h)
            || "m.youtube.com".equals(h)
            || "www.youtube-nocookie.com".equals(h)) {
            String path = url.getPath() != null ? url.getPath().toLowerCase(Locale.ROOT) : "";
            return path.startsWith("/pagead/")
                || path.startsWith("/api/stats/ads")
                || path.startsWith("/ptracking")
                || path.startsWith("/get_midroll_info");
        }
        return false;
    }

    private void registrarReceptorBloqueoPantalla() {
        if (screenReceiverRegistered) return;
        try {
            IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(screenOffReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(screenOffReceiver, filter);
            }
            screenReceiverRegistered = true;
        } catch (Exception ignored) {
        }
    }

    private void pausarReproductorWebView() {
        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }
        final WebView webView = this.bridge.getWebView();
        runOnUiThread(() -> {
            try {
                webView.evaluateJavascript(
                    "try{if(window.FMV_pausarVideo)window.FMV_pausarVideo();window.dispatchEvent(new Event('fmv-screen-lock'));}catch(e){}",
                    null
                );
            } catch (Exception ignored) {
            }
        });
    }

    @Override
    public void onPause() {
        pausarReproductorWebView();
        super.onPause();
    }

    @Override
    public void onStop() {
        pausarReproductorWebView();
        super.onStop();
    }

    @Override
    public void onDestroy() {
        if (screenReceiverRegistered) {
            try {
                unregisterReceiver(screenOffReceiver);
            } catch (Exception ignored) {
            }
            screenReceiverRegistered = false;
        }
        super.onDestroy();
    }

    @Override
    public void onResume() {
        super.onResume();
        hideSystemUi();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    private void hideSystemUi() {
        if (insetsController != null) {
            insetsController.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}

