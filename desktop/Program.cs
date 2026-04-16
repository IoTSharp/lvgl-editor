using OmniHost;
using OmniHost.Core;
using OmniHost.Gtk;
using OmniHost.WebKitGtk;
#if WINDOWS
using OmniHost.WebView2;
using OmniHost.Windows;
#endif

var builder = OmniApp.CreateBuilder(args)
    .Configure(options =>
    {
        options.Title = "LVGL Editor";
        options.CustomScheme = "app";
        options.ContentRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        options.StartUrl = "app://localhost/index.html";
        options.Width = 1440;
        options.Height = 960;
        options.StartMaximized = true;
        options.ScrollBarMode = OmniScrollBarMode.Auto;
        options.BuiltInTitleBarStyle = OmniBuiltInTitleBarStyle.VsCode;
        options.WindowStyle = OperatingSystem.IsWindows()
            ? OmniWindowStyle.VsCode
            : OmniWindowStyle.Frameless;
    })
    .UseDesktopApp(new LvglEditorDesktopApp());

ConfigureCurrentPlatform(builder);

await builder.Build().RunAsync();

static void ConfigureCurrentPlatform(OmniHostBuilder builder)
{
    if (OperatingSystem.IsLinux())
    {
        builder
            .UseAdapter(new WebKitGtkAdapterFactory())
            .UseRuntime(new GtkRuntime());
        return;
    }

#if WINDOWS
    if (OperatingSystem.IsWindows())
    {
        builder
            .UseAdapter(new WebView2AdapterFactory())
            .UseRuntime(new Win32Runtime());
        return;
    }
#endif

    if (OperatingSystem.IsMacOS())
    {
        throw new PlatformNotSupportedException(
            "OmniHost 当前版本尚未提供 macOS 原生运行时/适配器，当前构建仅用于保留统一的桌面打包产物。");
    }

    throw new PlatformNotSupportedException("当前平台暂不受支持。");
}

sealed class LvglEditorDesktopApp : IDesktopApp
{
    public Task OnStartAsync(IWebViewAdapter adapter, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task OnClosingAsync(CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
