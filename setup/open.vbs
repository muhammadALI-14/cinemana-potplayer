Dim objShell, objFSO
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strLog = objShell.SpecialFolders("Desktop") & "\cinemana_debug.log"
Set objLog = objFSO.CreateTextFile(strLog, True)
objLog.WriteLine "START: " & Timer

If WScript.Arguments.Count = 0 Then
    objLog.WriteLine "NO ARGS"
    objLog.Close
    WScript.Quit
End If

strArg = WScript.Arguments(0)

strClean = Replace(strArg, "cinemana-player://", "")
strClean = Replace(strClean, "potplayer://", "")
strClean = Replace(strClean, "%3A%2F%2F", "://")
strClean = Replace(strClean, "%5C", "|SEPARATOR|")

' استخراج موضع التشغيل (#pos=seconds) إن وُجد — ميزة تذكّر مكان التوقف
strPos = ""
arrPos = Split(strClean, "#pos=")
If UBound(arrPos) > 0 Then
    strPos = arrPos(1)
    strClean = arrPos(0)
End If

arrHash = Split(strClean, "#sub=")
strPart1 = arrHash(0)
strSub = ""
If UBound(arrHash) > 0 Then strSub = arrHash(1)

arrSep = Split(strPart1, "|SEPARATOR|")
strVideo = arrSep(0)
strTitle = ""
If UBound(arrSep) > 0 Then strTitle = arrSep(1)

strTitle = Replace(strTitle, "%20", " ")

objLog.WriteLine "VIDEO: " & strVideo
objLog.WriteLine "TITLE: " & strTitle
objLog.WriteLine "SUB: " & strSub
objLog.WriteLine "POS: " & strPos
objLog.WriteLine "DECODED: " & Timer

strPP = "C:\Program Files\DAUM\PotPlayer\PotPlayerMini64.exe"
If Not objFSO.FileExists(strPP) Then strPP = "C:\Program Files (x86)\DAUM\PotPlayer\PotPlayerMini.exe"

strSubFile = ""
If strSub <> "" Then
    strTempDir = objShell.ExpandEnvironmentStrings("%TEMP%")
    ' مفتاح كاش ثابت لكل ملف ترجمة = الـ GUID الموجود في رابط الترجمة،
    ' حتى نعيد استخدام نسخة محفوظة لو انتهت صلاحية الرابط الموقّع (400/403).
    Set re = New RegExp
    re.Pattern = "[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}"
    re.IgnoreCase = True
    strGuid = ""
    If re.Test(strSub) Then strGuid = re.Execute(strSub)(0).Value
    strCache = strTempDir & "\cinemana_sub_" & strGuid & ".vtt"
    On Error Resume Next
    Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    objHTTP.open "GET", strSub, False
    objHTTP.setRequestHeader "Referer", "https://cinemana.shabakaty.com"
    objHTTP.send
    If Err.Number = 0 And objHTTP.Status = 200 Then
        Set objStream = CreateObject("ADODB.Stream")
        objStream.Open
        objStream.Type = 1
        objStream.Write objHTTP.responseBody
        objStream.SaveToFile strCache, 2
        objStream.Close
        strSubFile = strCache
        objLog.WriteLine "SUB OK: " & Timer
    Else
        ' الرابط الموقّع انتهت صلاحيته — نعيد استخدام نسخة مخزّنة سابقاً إن وُجدت
        If objFSO.FileExists(strCache) Then
            strSubFile = strCache
            objLog.WriteLine "SUB CACHED (expired url): " & strGuid
        Else
            objLog.WriteLine "SUB FAIL: " & Err.Description & " " & objHTTP.Status
            strSubFile = ""
        End If
    End If
    On Error GoTo 0
End If

strCmd = """" & strPP & """ """ & strVideo & """"
If strTitle <> "" Then strCmd = strCmd & " /title=""" & strTitle & """"
If strSubFile <> "" Then strCmd = strCmd & " /sub=""" & strSubFile & """"
' مفتاح التبديل: False = /seek=<ثوانٍ> | True = /start=HH:MM:SS
' إن لم يقفز PotPlayer عند /seek، بدّل إلى True (يُسجَّل في cinemana_debug.log)
USE_START = False
If strPos <> "" Then
    If USE_START Then
        n = CLng(strPos)
        h = n \ 3600
        m = (n Mod 3600) \ 60
        s = n Mod 60
        strCmd = strCmd & " /start=" & Right("0" & CStr(h), 2) & ":" & Right("0" & CStr(m), 2) & ":" & Right("0" & CStr(s), 2)
        objLog.WriteLine "SEEK MODE: /start"
    Else
        strCmd = strCmd & " /seek=" & strPos
        objLog.WriteLine "SEEK MODE: /seek"
    End If
End If

objLog.WriteLine "CMD: " & strCmd
objLog.WriteLine "LAUNCH: " & Timer
objLog.Close

objShell.Run strCmd, 1, False
