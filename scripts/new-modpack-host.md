# Load Mission New Modpack

The green button on a Reforger mission page uses the same roles, confirmations, Discord choice and session history as Load Mission. It appears when the website has both receiver settings. The purple button continues to use the existing Discord bot.

## Prepare the Windows game host

1. Place GC Lobby's standalone `Start-GCMission.bat` beside `ArmaReforgerServer.exe`. Run the following PowerShell commands from that folder. Install Python 3 on this host for the receiver.
2. **Create the separate server config.** Copy your working Reforger server JSON to `new-modpack.json`. Keep the event server's normal bind/public settings, ports, name, passwords, admins, player limit and gameplay properties. Edit **`game.mods`** to contain only the mods that must load on every new-modpack mission. Use `"mods": []` if the mission metadata supplies every mod. Remove obsolete legacy-pack entries from this copy. Keep any required always-on version pins. The launcher sets `game.scenarioId` and merges mission-specific mods into `new-modpack-profile/gc-launch.generated.json` for each launch. Protect that profile like the server config. For a parallel test instance, use separate unused ports.
3. Provide `stop-event-server.ps1` in the same folder using the event host's existing shutdown procedure. It must stop only the configured event instance, wait for it and any previous launcher to exit, return 0 when already stopped or successfully stopped, and exit nonzero on failure. Ensure service supervisors allow the new launcher to take ownership. The receiver runs this hook only after a successful metadata/config preview. Keep the legacy restart procedure able to take ownership again when switching back.
4. Create a `missions` folder. Export one file per published mission from its matching source header and deploy it as `missions/<SCENARIO-GUID>.launch.json`. For example, with the Kill Zone header in your Missions Dev checkout:

```powershell
New-Item -ItemType Directory -Force missions
.\Start-GCMission.bat "C:\GC\gc-reforger-missions\Missions\Burn0ut7\KillZone.conf" -ExportMetadata ".\missions\EE70EC94CEE2D6AB.launch.json"
.\Start-GCMission.bat ".\missions\EE70EC94CEE2D6AB.launch.json" -Config ".\new-modpack.json" -PlanOnly
```

Use the scenario GUID from the header's adjacent `.conf.meta`. The exported scenario must match the website's GUID and resource path. Refresh exports when the published build changes. Required packages must be available to this Reforger server.

## Connect the website

Set a private random `NEW_MODPACK_LAUNCH_TOKEN` for both the receiver and the website. From the game server folder, run `python C:\path\to\website\scripts\new-modpack-host.py` under the game service account and keep it running. Set the website's server-side `NEW_MODPACK_LAUNCH_URL` to `http://127.0.0.1:8771/launch` if it runs on the same host. For separate hosts, route through a private HTTPS reverse proxy or tunnel to the receiver's loopback listener. Restart the website after setting its environment.

The receiver validates the deployed scenario and previews the plan before calling the shutdown hook. It acknowledges dispatch once the launcher starts and holds off further new-modpack requests until the launcher prints `Ready:` or exits. Check the receiver output and the engine logs in `new-modpack-profile` for the actual startup result. The receiver's service and proxy should allow up to 95 seconds for preview and shutdown. After an interrupted run, reconcile any active server and launcher marker before retrying.
