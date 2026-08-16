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
        private static Thread serverThread;
        private static bool isRunning = true;
        private static Process appWindowProcess;

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
            // Find an available port
            serverPort = GetAvailablePort(3000);

            // Start in-memory HTTP listener
            listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:" + serverPort + "/");
            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Yerel Flowide motoru başlatılamadı: " + ex.Message, "Flowide Hata", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            serverThread = new Thread(ListenRequests);
            serverThread.IsBackground = true;
            serverThread.Start();

            string appUrl = "http://127.0.0.1:" + serverPort + "/index.html";

            // Launch in dedicated modern Desktop App Mode (Window without URL bar or browser tabs)
            LaunchDesktopAppWindow(appUrl);

            // Clean shutdown when the desktop window is closed
            if (appWindowProcess != null)
            {
                try
                {
                    appWindowProcess.WaitForExit();
                }
                catch { }
            }

            isRunning = false;
            try { listener.Stop(); } catch { }
        }

        private static void LaunchDesktopAppWindow(string targetUrl)
        {
            string[] possibleBrowsers = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe")
            };

            string browserPath = null;
            foreach (var b in possibleBrowsers)
            {
                if (File.Exists(b))
                {
                    browserPath = b;
                    break;
                }
            }

            if (browserPath != null)
            {
                string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Flowide", "AppProfile");
                try
                {
                    if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);
                }
                catch { }

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browserPath,
                    Arguments = string.Format("--app=\"{0}\" --window-size=1360,860 --user-data-dir=\"{1}\" --app-id=flowide-ide --disable-features=TranslateUI --no-first-run", targetUrl, profileDir),
                    UseShellExecute = false
                };

                try
                {
                    appWindowProcess = Process.Start(psi);
                    return;
                }
                catch { }
            }

            // Fallback to default browser if no Chromium/Edge engine found
            try
            {
                Process.Start(targetUrl);
            }
            catch { }
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
