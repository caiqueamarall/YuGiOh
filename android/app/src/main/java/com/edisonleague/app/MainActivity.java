package com.edisonleague.app;

import android.content.Context;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new AndroidPrintInterface(), "AndroidPrintBridge");
        }
    }

    public class AndroidPrintInterface {
        @JavascriptInterface
        public void printHtml(final String htmlContent, final String docName) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        final WebView printWebView = new WebView(MainActivity.this);
                        printWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public void onPageFinished(WebView view, String url) {
                                super.onPageFinished(view, url);
                                try {
                                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                    if (printManager != null) {
                                        PrintDocumentAdapter printAdapter = printWebView.createPrintDocumentAdapter(docName);
                                        PrintAttributes.Builder builder = new PrintAttributes.Builder();
                                        builder.setColorMode(PrintAttributes.COLOR_MODE_COLOR);
                                        builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
                                        builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
                                        printManager.print(docName, printAdapter, builder.build());
                                    }
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                            }
                        });
                        printWebView.loadDataWithBaseURL("https://localhost", htmlContent, "text/html", "UTF-8", null);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }
}

