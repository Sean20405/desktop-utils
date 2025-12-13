using System;
using System.Drawing; // NuGet: System.Drawing.Common
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading; // 用於 Sleep
using System.Windows.Automation; // 需要 .csproj <UseWPF>true</UseWPF>

namespace DesktopIconTool
{
    class Program
    {
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll")]
        public static extern IntPtr FindWindowEx(IntPtr hwndParent, IntPtr hwndChildAfter, string lpszClass, string lpszWindow);

        static void Main(string[] args)
        {
            Console.WriteLine("=== 桌面圖示抓取工具 (顯示資料夾版) ===");

            if (!System.Runtime.InteropServices.RuntimeInformation.IsOSPlatform(System.Runtime.InteropServices.OSPlatform.Windows))
            {
                Console.WriteLine("僅支援 Windows。");
                return;
            }

            try
            {
                GetDesktopIconsSafe();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[錯誤] {ex.Message}");
            }

            Console.WriteLine("\n執行完畢，按任意鍵退出...");
            Console.ReadKey();
        }

        static void GetDesktopIconsSafe()
        {
            IntPtr listviewHandle = GetDesktopListViewHandle();
            if (listviewHandle == IntPtr.Zero)
            {
                Console.WriteLine("找不到桌面視窗，無法繼續。");
                return;
            }

            Console.WriteLine("正在分析桌面...");

            AutomationElement desktopList = AutomationElement.FromHandle(listviewHandle);
            if (desktopList == null) return;

            AutomationElementCollection items = desktopList.FindAll(TreeScope.Children,
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem));

            Console.WriteLine($"偵測到 {items.Count} 個圖示。\n");

            string userDesktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string publicDesktop = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);

            // 設定輸出檔案名稱
            string outputFileName = "Desktop_Icons_Info.txt";

            // 使用 StreamWriter 開啟檔案 (false 表示覆寫檔案，Encoding.UTF8 確保中文不亂碼)
            using (StreamWriter writer = new StreamWriter(outputFileName, false, System.Text.Encoding.UTF8))
            {
                int index = 0;
                foreach (AutomationElement item in items)
                {
                    Thread.Sleep(50); // 稍微休息避免被防毒擋

                    string name = item.Current.Name;
                    System.Windows.Rect rect = item.Current.BoundingRectangle;

                    // 搜尋檔案或資料夾路徑
                    string fullPath = FindPathOnDesktop(name, userDesktop, publicDesktop);
                    bool found = !string.IsNullOrEmpty(fullPath);

                    // 判斷是否為資料夾
                    bool isFolder = false;
                    if (found && Directory.Exists(fullPath))
                    {
                        isFolder = true;
                    }

                    string iconMsg = "無";
                    if (found)
                    {
                        try
                        {
                            if (!isFolder)
                            {
                                using (Icon ico = Icon.ExtractAssociatedIcon(fullPath))
                                {
                                    if (ico != null)
                                    {
                                        using (Bitmap bmp = ico.ToBitmap())
                                        {
                                            string safeName = string.Concat(name.Split(Path.GetInvalidFileNameChars()));
                                            if (safeName.Length > 20) safeName = safeName.Substring(0, 20);

                                            string filename = $"icon_{index}_{safeName}.png";
                                            bmp.Save(filename, ImageFormat.Png);
                                            iconMsg = $"已儲存 (Icon file: {filename})";
                                        }
                                    }
                                }
                            }
                        }
                        catch { }
                    }

                    // === 依照你的需求修改輸出邏輯 ===

                    // 如果是資料夾，強制將 iconMsg 改為 "資料夾"
                    iconMsg = isFolder ? "資料夾" : iconMsg;

                    // 準備要輸出的內容 (先存成字串，方便同時給 Console 和 Writer 用)
                    string line1 = $"[{index}] {name}";
                    string line2 = $"    位置: ({rect.X}, {rect.Y})";
                    string line3 = $"    路徑: {(found ? fullPath : "找不到路徑")}";
                    string line4 = $"    圖示: {iconMsg}";
                    string line5 = "-----------------------------------";

                    // 1. 輸出到螢幕
                    Console.WriteLine(line1);
                    Console.WriteLine(line2);
                    Console.WriteLine(line3);
                    Console.WriteLine(line4);
                    Console.WriteLine(line5);

                    // 2. 寫入到 txt 檔案
                    writer.WriteLine(line1);
                    writer.WriteLine(line2);
                    writer.WriteLine(line3);
                    writer.WriteLine(line4);
                    writer.WriteLine(line5);
                    // ==============================

                    index++;
                }
            } // 離開這個括號時，檔案會自動儲存並關閉

            // 告訴使用者檔案存到哪裡了
            Console.WriteLine($"\n文字資訊已匯出至: {Path.GetFullPath(outputFileName)}");
        }

        static IntPtr GetDesktopListViewHandle()
        {
            IntPtr progman = FindWindow("Progman", "Program Manager");
            IntPtr shellDllDefView = FindWindowEx(progman, IntPtr.Zero, "SHELLDLL_DefView", null);

            if (shellDllDefView == IntPtr.Zero)
            {
                IntPtr workerW = IntPtr.Zero;
                while (true)
                {
                    workerW = FindWindowEx(IntPtr.Zero, workerW, "WorkerW", null);
                    if (workerW == IntPtr.Zero) break;
                    shellDllDefView = FindWindowEx(workerW, IntPtr.Zero, "SHELLDLL_DefView", null);
                    if (shellDllDefView != IntPtr.Zero) break;
                }
            }
            return FindWindowEx(shellDllDefView, IntPtr.Zero, "SysListView32", null);
        }

        static string FindPathOnDesktop(string iconName, string userDesktop, string publicDesktop)
        {
            string[] folders = { userDesktop, publicDesktop };

            foreach (var folder in folders)
            {
                if (!Directory.Exists(folder)) continue;

                string tryExact = Path.Combine(folder, iconName);

                // File.Exists 是檔案，Directory.Exists 是資料夾
                if (File.Exists(tryExact) || Directory.Exists(tryExact)) return tryExact;

                if (File.Exists(tryExact + ".lnk")) return tryExact + ".lnk";
                if (File.Exists(tryExact + ".url")) return tryExact + ".url";

                try
                {
                    var matches = Directory.GetFiles(folder, iconName + ".*");
                    if (matches.Length > 0) return matches[0];
                }
                catch { }
            }

            return null;
        }
    }
}