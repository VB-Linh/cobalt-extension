Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Tự động xác định đường dẫn file start-cobalt-windows.bat
If fso.FileExists(fso.BuildPath(currentDir, "scripts\start-cobalt-windows.bat")) Then
    batPath = fso.BuildPath(currentDir, "scripts\start-cobalt-windows.bat")
ElseIf fso.FileExists(fso.BuildPath(currentDir, "start-cobalt-windows.bat")) Then
    batPath = fso.BuildPath(currentDir, "start-cobalt-windows.bat")
Else
    batPath = "D:\repo\cobalt tools extension\scripts\start-cobalt-windows.bat"
End If

' Khởi chạy ngầm hoàn toàn (0 = ẩn hoàn toàn cửa sổ CMD)
CreateObject("Wscript.Shell").Run "cmd.exe /c call """ & batPath & """", 0, False
