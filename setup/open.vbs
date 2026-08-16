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
strClean = Replace(strClean, "%3A%2F%2F", "://")
strClean = Replace(strClean, "%5C", "|SEPARATOR|")

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
objLog.WriteLine "DECODED: " & Timer

strPP = "C:\Program Files\DAUM\PotPlayer\PotPlayerMini64.exe"
If Not objFSO.FileExists(strPP) Then strPP = "C:\Program Files (x86)\DAUM\PotPlayer\PotPlayerMini.exe"

strSubFile = ""
If strSub <> "" Then
    strTempDir = objShell.ExpandEnvironmentStrings("%TEMP%")
    strSubFile = strTempDir & "\cinemana_sub.vtt"
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
        objStream.SaveToFile strSubFile, 2
        objStream.Close
        objLog.WriteLine "SUB OK: " & Timer
    Else
        objLog.WriteLine "SUB FAIL: " & Err.Description & " " & objHTTP.Status
        strSubFile = ""
    End If
    On Error GoTo 0
End If

strCmd = """" & strPP & """ """ & strVideo & """"
If strTitle <> "" Then strCmd = strCmd & " /title=""" & strTitle & """"
If strSubFile <> "" Then strCmd = strCmd & " /sub=""" & strSubFile & """"

objLog.WriteLine "CMD: " & strCmd
objLog.WriteLine "LAUNCH: " & Timer
objLog.Close

objShell.Run strCmd, 1, False
