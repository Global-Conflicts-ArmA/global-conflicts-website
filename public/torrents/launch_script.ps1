# Define your Arma 3 install folder, if you want. Otherwise just leave it blank to let the script look it up.
$A3_PATH = ""

# Define your A3 executable name
$A3_EXE = "arma3battleye.exe"

#Define your startup parameters
$PARAMETERS = ("2 1", "-nosplash", "-skipintro", "-world=empty")



function LaunchArma {
param(
[Alias("PSPath")]
[Parameter(Position = 0, Mandatory = $true, ValueFromPipeline = $true, ValueFromPipelineByPropertyName = $true)]
[String]$Path
)
#finds all the modfolders in the script directory
$modFolders = (Get-ChildItem  -Filter "@*" -Directory).Fullname
$modsArg = ""
foreach ($mod in $modFolders) {
$modsArg += "$($mod);"
}
$armaArgs = "$PARAMETERS -mod=`"$modsArg`""
Write-Host "Launching Arma with the following params:"
Write-Host $armaArgs
start-process -PassThru -FilePath "$path" -ArgumentList $armaArgs
}



Function Test-RegistryValue {
param(
[Alias("PSPath")]
[Parameter(Position = 0, Mandatory = $true, ValueFromPipeline = $true, ValueFromPipelineByPropertyName = $true)]
[String]$Path
,
[Parameter(Position = 1, Mandatory = $true)]
[String]$Name
,
[Switch]$PassThru
)

process {
if (Test-Path $Path) {
    $Key = Get-Item -LiteralPath $Path
    if ($null -ne $Key.GetValue($Name, $null)) {
        if ($PassThru) {
            Get-ItemProperty $Path $Name
        }
        else {
            (Get-ItemProperty -Path $Path -Name $Name).$Name
        }
    }
    else {
        $false
    }
}
else {
    $false
}
}
}

if ($A3_PATH -eq "") {
#Arma 3 path lookup
$BIPahts = (
"Registry::HKLM\SOFTWARE\Bohemia Interactive\ArmA 3",
"Registry::HKLM\SOFTWARE\Bohemia Interactive Studio\ArmA 3",
"Registry::HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\bohemia interactive\arma 3",
"Registry::HKLM\SOFTWARE\Wow6432Node\Bohemia Interactive\ArmA 3"
)
$foundPath = $false
Foreach ($BIPath in $BIPahts) {

write-Host -ForegroundColor white "Looking for Arma 3 registry at: $($BIPath)"
$arma3FolderPath = Test-RegistryValue -Path $BIPath -Name 'main'
$A3_PATH = "$($arma3FolderPath)\$($A3_EXE)"
$foundPath = Test-Path $A3_PATH -PathType Leaf
if ($foundPath) {
    write-Host -ForegroundColor green "Arma 3 install folder found at: $($A3_PATH)"
    LaunchArma -Path $A3_PATH
    exit


}
}
#Arma3 not in BI directories, looking into Steam
if (!$foundPath) {
write-Host -ForegroundColor yellow "Arma 3 install was not found on the most common BI Registry locations. Looking for Steam."
$SteamPahts = (
    "Registry::HKLM\SOFTWARE\Wow6432Node\Valve\Steam",
    "Registry::HKLM\SOFTWARE\Valve\Steam"
)
Foreach ($SteamPath in $SteamPahts) {

    write-Host -ForegroundColor white "Looking for Arma 3 registry at: $($SteamPath)"
    $SteamFolderPath = Test-RegistryValue -Path $SteamPath -Name 'InstallPath'
    $A3_PATH = "$($SteamFolderPath)\steamapps\common\Arma 3\$($A3_EXE)"
    $foundPath = Test-Path $A3_PATH -PathType Leaf
    if ($foundPath) {
        write-Host -ForegroundColor green "Arma 3 install folder found at: $($A3_PATH)"
        LaunchArma -Path $A3_PATH
        exit
    }
}
write-Host -ForegroundColor red "Arma 3 install folder not found! Can't launch Arma without it, chief. Try manually inputting the path on this script. (It's the first thing at the top)"
}
}
else {
write-Host -ForegroundColor Magenta "Using given Arma 3 path."
if (Test-Path $A3_PATH -PathType Leaf) {
LaunchArma -Path $A3_PATH
exit
}
else {
write-Host -ForegroundColor red "Your given Arma 3 install folder is invalid!"
}
}
