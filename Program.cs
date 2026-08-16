using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Drawing;

namespace FlowideLauncher
{
    static class Program
    {
        private static HttpListener listener;
        private static int serverPort = 3000;
        private static NotifyIcon trayIcon;
        private static Thread serverThread;
        private static bool isRunning = true;

        private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            { ".html", "text/html; charset=UTF-8" },
            { ".htm", "text/html; charset=UTF-8" },
            { ".css", "text/css; charset=UTF-8" },
            { ".js", "application/javascript; charset=UTF-8" },
            { ".json", "application/json; charset=UTF-8" },
            { ".svg", "image/svg+xml" },
            { ".png", "image/png" },
            { ".jpg", "image/jpeg" },
            { ".jpeg", "image/jpeg" },
            { ".ico", "image/x-icon" },
            { ".txt", "text/plain; charset=UTF-8" },
            { ".xml", "application/xml; charset=UTF-8" },
            { ".ino", "text/plain; charset=UTF-8" }
        };

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Find an available port
            serverPort = GetAvailablePort(3000);

            // Start HTTP listener
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + serverPort + "/");
            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Yerel sunucu başlatılamadı: " + ex.Message, "Flowide Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            serverThread = new Thread(ListenRequests);
            serverThread.IsBackground = true;
            serverThread.Start();

            string appUrl = "http://127.0.0.1:" + serverPort + "/index.html";

            // Open browser
            try
            {
                Process.Start(appUrl);
            }
            catch { }

            // Create System Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Flowide - Görsel Arduino IDE";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Flowide'ı Tarayıcıda Aç", (s, e) => { Process.Start(appUrl); });
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Çıkış", (s, e) => {
                isRunning = false;
                try { listener.Stop(); } catch { }
                trayIcon.Visible = false;
                Application.Exit();
            });
            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => { Process.Start(appUrl); };

            // Show balloon tip
            trayIcon.ShowBalloonTip(3000, "Flowide Başlatıldı", "Uygulama arka planda çalışıyor. Tarayıcınızdan erişebilirsiniz.", ToolTipIcon.Info);

            Application.Run();
        }

        private static int GetAvailablePort(int startingPort)
        {
            int port = startingPort;
            for (int i = 0; i < 50; i++)
            {
                try
                {
                    TcpListener tcp = new TcpListener(IPAddress.Loopback, port);
                    tcp.Start();
                    tcp.Stop();
                    return port;
                }
                catch
                {
                    port++;
                }
            }
            return 0; // Dynamic
        }

        private static void ListenRequests()
        {
            Assembly asm = Assembly.GetExecutingAssembly();

            while (isRunning && listener.IsListening)
            {
                try
                {
                    HttpListenerContext ctx = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((state) =>
                    {
                        ProcessRequest(ctx, asm);
                    });
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void ProcessRequest(HttpListenerContext ctx, Assembly asm)
        {
            try
            {
                string path = ctx.Request.Url.LocalPath.TrimStart('/');
                if (string.IsNullOrEmpty(path))
                {
                    path = "index.html";
                }

                // Try to load embedded resource or local file
                byte[] content = null;
                string ext = Path.GetExtension(path).ToLower();

                // 1. Check Embedded Assembly Resources
                string resourceName = "Flowide." + path.Replace('/', '.');
                using (Stream stream = asm.GetManifestResourceStream(resourceName))
                {
                    if (stream != null)
                    {
                        using (MemoryStream ms = new MemoryStream())
                        {
                            stream.CopyTo(ms);
                            content = ms.ToArray();
                        }
                    }
                }

                // 2. If not found in embedded resources, check local directory fallback
                if (content == null && File.Exists(path))
                {
                    content = File.ReadAllBytes(path);
                }

                if (content != null)
                {
                    string mime = MimeTypes.ContainsKey(ext) ? MimeTypes[ext] : "application/octet-stream";
                    ctx.Response.ContentType = mime;
                    ctx.Response.ContentLength64 = content.Length;
                    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
                    ctx.Response.Headers["X-Frame-Options"] = "SAMEORIGIN";
                    ctx.Response.StatusCode = 200;
                    ctx.Response.OutputStream.Write(content, 0, content.Length);
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                    byte[] notFound = System.Text.Encoding.UTF8.GetBytes("<html><body style='background:#09090d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;'><h2>404 - Sayfa Bulunamadı</h2><p><a href='/index.html' style='color:#38bdf8;'>Ana Sayfaya Dön</a></p></body></html>");
                    ctx.Response.ContentType = "text/html; charset=UTF-8";
                    ctx.Response.ContentLength64 = notFound.Length;
                    ctx.Response.OutputStream.Write(notFound, 0, notFound.Length);
                }
            }
            catch { }
            finally
            {
                try { ctx.Response.Close(); } catch { }
            }
        }
    }
}
