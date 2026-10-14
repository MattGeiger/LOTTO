# Legacy iPad simulator setup and troubleshooting

## Later acceptance checkpoint — October 7, 2026

The setup history below preserves what was verified at each earlier checkpoint.
Later that day the owner supplied the running macOS 26 guest with an iPad mini 4
on iOS 15.4. The runtime and Safari were visibly verified, and the owner assisted
with RC.7 application checks because guest mouse automation remained unreliable.
The owner reported responsive language/theme controls and accepted proceeding
to production, with fresh sign-in still unverified. The VM was subsequently
shut down by the owner. See the detailed evidence and limits in
[Public configuration publication](PUBLIC_CONFIGURATION_PUBLICATION.md#verification-record).
This supersedes earlier pending boot/acceptance statuses as a later checkpoint;
it does not establish physical-device testing or fresh email sign-in.

## Status recorded October 7, 2026

**Partial result:** directly launching Xcode 26.6 works on this macOS 27.0.1
machine. Simulator opens and an iPhone 11 / iOS 26.5 window runs. The existing
iPad mini 4 / iOS 15.4 device cannot boot: CoreSimulator rejects this runtime
on macOS 27. Opening an older Xcode does not remove that separate restriction.

This record documents an unsupported Xcode launch workaround, a failed host
legacy-runtime boot, and an isolated macOS 26 guest that has installed and
reached its desktop. Xcode is installed in the guest and normal launch reached
the Xcode and Apple SDKs Agreement. The owner later installed ChatGPT inside the
VM and requested handoff; that instance began the iOS 15.4 download in Xcode.
Runtime installation and boot verification remain unconfirmed. It is not
a successful iPadOS 15.4 setup or LOTTO compatibility acceptance record.

## Environment and existing assets

| Item | Observed value |
| --- | --- |
| Host | macOS 27.0.1, build 26A434 |
| Hardware | Apple M5 Max, 128 GB memory |
| Current Xcode | `/Applications/Xcode.app`, version 27.0 |
| Older Xcode | `/Applications/Xcode26.app`, version 26.6, build 17F113 |
| Installed legacy runtime | iOS 15.4, build 19E240, Universal, approximately 12.4 GB |
| Runtime identifier | `com.apple.CoreSimulator.SimRuntime.iOS-15-4` |
| Runtime bundle | `/Library/Developer/CoreSimulator/Profiles/Runtimes/iOS 15.4.simruntime` |
| Existing device | `LOTTO iPad Mini 4` |
| Device type | `com.apple.CoreSimulator.SimDeviceType.iPad-mini-4` |
| Existing device identifier | `E37DF1E2-62C1-45BB-B743-C67ABD9C45F5` |

Apple's runtime is named **iOS 15.4** even for an iPad simulator. Selecting
that runtime with the iPad mini 4 device type is the requested iPadOS 15.4
configuration. Its inventory lists both `arm64` and `x86_64`, and includes
iPad mini 4 among supported device types. The observed rejection is a host
version restriction, not a missing device type or missing runtime download.

Paths and device identifiers above are specific to this machine. Recheck them
after moving Xcode, replacing runtimes, or recreating devices.

## Repeat the working Xcode 26 launch

1. Open Finder and choose **Go → Go to Folder…** (`Command-Shift-G`).
2. Enter `/Applications/Xcode26.app/Contents/MacOS/`.
3. Open the **Xcode** Unix executable inside that folder. Open the executable,
   rather than the outer `Xcode26.app` bundle.
4. Finder hands the executable to Terminal. Allow time for Xcode to open.
5. Verify the Welcome window says **Xcode Version 26.6**, or inspect
   **Xcode → About Xcode**. Xcode 27 can be running at the same time, so an
   arbitrary Xcode window is not sufficient evidence.

The normal app launch returned `kLSIncompatibleApplicationVersionErr` on this
host. Opening the internal executable succeeded: the owner confirmed the
launch, and subsequent Computer Use inspection visibly read **Xcode Version
26.6** in its Welcome window.

The agent did not type commands into Terminal during this launch. Computer Use
denied Terminal access when the agent tried to inspect it. Finder's executable
opening was the action that initiated the direct launch.

The equivalent command for a human using Terminal is:

```sh
/Applications/Xcode26.app/Contents/MacOS/Xcode
```

That typed-command variant was not independently tested in this session.

To open its bundled Simulator, locate this app in Finder and open it:

```text
/Applications/Xcode26.app/Contents/Developer/Applications/Simulator.app
```

Computer Use requested that exact app path. The resulting visible Simulator
window was **iPhone 11 iOS26 – iOS 26.5**. This established that Simulator
opened; it did not establish that the 15.4 runtime worked.

## Inspect or configure the legacy device

1. In the verified Xcode 26 window, choose **Window → Devices and Simulators**.
2. Select **Simulators**.
3. Check for an existing iPad mini 4 / iOS 15.4 device before creating a
   duplicate. Unavailable devices may be hidden in this UI; the command-line
   inventory below includes them.
4. If a new device is needed, click **+** and select **iPad mini 4**.
5. Select **iOS 15.4** and name it **LOTTO-iPadMini4-iOS15** only if that
   runtime is offered. If the selector reads **No Runtimes**, cancel the
   dialog and inspect availability before downloading or changing anything.

On this host, selecting iPad mini 4 produced **No Runtimes**. The runtime
information under **Xcode → Settings → Components** nevertheless showed the
installed **iOS 15.4 Simulator**, version **15.4 (19E240)**, Universal,
approximately 12.4 GB. The new-device dialog was cancelled; no duplicate was
created, and no runtime was deleted or reinstalled.

## Repeat the diagnostic and boot attempt

These diagnostic commands select Xcode 26 for that command only. They do not
change the machine's global `xcode-select` setting. On this host, use the shared
framework's binary directly: the Xcode 26 `simctl` wrapper can invoke component
bootstrap when its expected CoreSimulator version differs from the installed
one. Do not use that wrapper for further host diagnostics.

Check the Xcode version and runtime/device availability:

```sh
/Applications/Xcode26.app/Contents/Developer/usr/bin/xcodebuild -version

DEVELOPER_DIR=/Applications/Xcode26.app/Contents/Developer \
  /Library/Developer/PrivateFrameworks/CoreSimulator.framework/Versions/A/Resources/bin/simctl list runtimes

DEVELOPER_DIR=/Applications/Xcode26.app/Contents/Developer \
  /Library/Developer/PrivateFrameworks/CoreSimulator.framework/Versions/A/Resources/bin/simctl list devices
```

The existing device was already configured correctly. The earlier recorded
boot attempt used the wrapper and reused its identifier (historical evidence,
not a recommendation to repeat the wrapper on the host):

```sh
DEVELOPER_DIR=/Applications/Xcode26.app/Contents/Developer \
  /Applications/Xcode26.app/Contents/Developer/usr/bin/simctl boot \
  E37DF1E2-62C1-45BB-B743-C67ABD9C45F5
```

Result: process exit status **145**, CoreSimulator error **401**:

```text
An error was encountered processing the command (domain=com.apple.CoreSimulator.SimError, code=401):
The iOS 15.4 simulator runtime is not available.
The iOS 15.4 simulator runtime is not supported on hosts after macOS 26.99.99.
The iOS 15.4 simulator runtime is not supported on macOS 27.0.1.
```

After the attempt, the existing device remained **Shutdown**, with
`isAvailable: false` and the same availability error. Its recorded last-use
timestamp remained September 15. The existing legacy iPhone device also
remained intact.

## Next environment and acceptance criteria

### Authorized continuation: UTM guest

Later on October 7, the owner authorized continued host investigation and,
if the runtime remained blocked, installing UTM and building a macOS 26 guest
with Xcode 26 and the iOS 15.4 runtime. Existing host installations and simulator
data must be preserved. The VM route is now in progress; the earlier failed
boot remains the observed host result.

Inspection found that Xcode 26.6's `usr/bin/simctl` is a shell wrapper that
delegates to `/Library/Developer/PrivateFrameworks/CoreSimulator.framework`.
It also contains a version-mismatch branch that invokes `xcodebuild
-runFirstLaunch`. At inspection time the shared framework remained **1171.7**,
whereas the wrapper expected **1051.55**. Future host diagnostics should use
the shared framework's actual `Resources/bin/simctl` directly to avoid that
bootstrap branch. No deliberate framework replacement or runtime patch was
performed. The host restriction string and `26.99.99` cutoff are present in
the shared framework binary; changing Xcode paths alone does not isolate it.

Prepared assets are under
`<HOME>/Downloads/LOTTO-Simulator-Setup/`:

- UTM **4.7.5**, downloaded from the official `utmapp/UTM` GitHub release;
  `codesign --verify --deep --strict` passed and `spctl` reported **accepted,
  Notarized Developer ID**, signed by Turing Software, LLC, team WDNLXAD4W8.
- macOS **26.6.2**, build **25G83**, universal restore image downloaded from
  Apple's `updates.cdn-apple.com` server. Apple reports 19,772,231,540 bytes
  and SHA-256 `885503b7f4b06609e9a512f2befd40f59730640a3f1233e3892d60affdd51c95`.
  The local SHA-256 matched that value. UTM accepted the image for installation.
- `Guest-Installers/Xcode_26.6_Apple_silicon.xip`, a copy of the existing installer.
  Its local SHA-256 is
  `06384762f286fb4d20440f7a67ba40cdf79bedb1cbee9e5111e3030a53a6cb81`;
  this records the staged file, not an independent Apple-published checksum.
- `Guest-Installers/iOS-15.4-Simulator.dmg`, Apple's original simulator installer,
  downloaded from
  `devimages-cdn.apple.com`. Copying the installed runtime encountered an
  unreadable root-owned `private/var/mobile` directory; that incomplete copy
  was renamed `iOS-15.4-incomplete-copy.do-not-use` and must not be installed.
  The host original stays in place. `hdiutil verify` passed for the original DMG;
  its `iPhoneSimulatorSDK15_4.pkg` signature verified as **signed Apple Software
  (Development)** with a trusted April 21, 2022 timestamp.

Apple's downloaded simulator catalog independently confirms the host boundary:
`com.apple.pkg.iPhoneSimulatorSDK15_4` has `maxHostVersion: 26.99.0` and
`maxXcodeVersion: 26.99.0`. Its original installer is 5,425,406,116 bytes at
`https://devimages-cdn.apple.com/downloads/xcode/simulators/com.apple.pkg.iPhoneSimulatorSDK15_4-15.4.1.1650505652.dmg`.

Saved guest settings: Apple virtualization, 8 CPU cores, 32 GB memory,
160 GB expandable disk, ordinary shared networking, and a read-only share
limited to `Guest-Installers`. Sound and clipboard sharing are disabled.
The VM is saved at
`<HOME>/VirtualMachines/LOTTO-Legacy-Testing/LOTTO-iPadOS15.4-macOS26.utm`.
Its ASIF disk initially occupies about 4 MB; UTM's Resize dialog confirms a
160 GB virtual capacity. File size alone is not capacity for this format.
No broad home-folder share, host OS
downgrade, SIP/Gatekeeper change, or host CoreSimulator replacement is part of
this procedure. The fresh macOS installation and Setup Assistant completed;
the owner confirmed setup was complete, and the guest Finder desktop was
visibly inspected. Xcode installation and legacy Safari acceptance remain
pending at this checkpoint. The owner explicitly approved Apple's macOS
agreement and continuation proceeded past the language screen. Guest setup uses
English (US), United States and **Set up as new**, without migrating host data.
At the account-creation handoff, the prepared full-name label was
`lotto test`, and the prepared account name was `lotto`. The owner-created
account observed later in guest Terminal is **`lottotest`**, on
`lottos-Virtual-Machine`. Apple Account password recovery
was unchecked for this separate local testing account. The owner completed
account creation directly; no password is recorded here.

After desktop setup, Computer Use could inspect the UTM guest and operate its
native toolbar, but coordinate clicks into the guest display either selected
the UTM Library window or failed with `noWindowsAvailable`. Reopening the
existing `.utm` bundle through Finder restored UTM inspection after a timeout.
Selecting **Window → LOTTO-iPadOS15.4-macOS26**, exiting full screen, resetting
the tool connection, and toggling input capture did not restore guest mouse
control. This is an automation-control blocker, not evidence that Xcode or
the legacy runtime failed inside the VM. Guest input capture was left off.

The owner opened Terminal inside the guest. Computer Use then delivered ordinary
text and Return to the guest shell, but shifted characters were corrupted:
`sw_vers` arrived as `sw-vers`. Two diagnostic text attempts arrived with delay
and combined into `sw-verssw-vers`, which returned command not found. A single
`uname -a` command succeeded and reported **Darwin 25.6.0**, **arm64**, confirming
that command execution reached the guest. Do not resend input just because an
immediate screenshot is unchanged; inspect again before repeating it.

The failing input test used UTM's **Mac Keyboard (macOS 14+)**. UTM's
toolbar Stop action displayed a corruption warning, so it was **cancelled**.
Instead `sudo shutdown -h now` was submitted in guest Terminal and reached the
guest password prompt for a clean shutdown. The owner entered the existing
password directly and confirmed shutdown. UTM subsequently showed **Stopped**.
In **Edit → Virtualization → Keyboard**, the agent selected **Generic USB**,
saved, and started the VM again. The on-disk configuration confirmed
`Keyboard: Generic`, `Pointer: Trackpad`, and `ClipboardSharing: false`.
The owner signed in again. Generic USB did **not** fix the shifted-character
problem. Encoding a command into octal ASCII and decoding it with `printf`
inside the guest Terminal did preserve capitals and underscores. This verified
`sw_vers`: **macOS 26.6.2, build 25G83**. Ordinary manual typing by a human does
not require this automation workaround. The shell wrapper used by Computer Use
is `eval` followed by a backtick-delimited `printf` of the single-quoted octal
string; for example, `sw_vers` becomes:

```sh
eval `printf '\163\167\137\166\145\162\163'`
```

The older UTM guest instructions' `mount_virtiofs share installers` failed with
`fs_tag share not found`. UTM 4.7.5 automatically mounted the share at
the shared installer directory; no manual remount was needed. In the examples
below, replace `<shared-installers>` with that directory's guest mount path.
This matches the [UTM project's outdated-documentation report](https://github.com/utmapp/UTM/issues/7677).
Guest `/Applications` contained only Safari and Utilities before installation,
and the guest filesystem reported **125 GiB available**. Xcode unpacking was
started directly from the read-only share into a new guest Downloads directory:

```sh
ls -lh '<shared-installers>'
mkdir -p ~/Downloads/xcode26-setup
cd ~/Downloads/xcode26-setup
xip --expand '<shared-installers>/Xcode_26.6_Apple_silicon.xip'
```

Unpacking completed. `xip` reported a **Software Update** signing certificate
and **validation not attempted**. Separate verification of the extracted app
then passed `codesign --verify --deep --strict --verbose=2` (**valid on disk**,
**satisfies its Designated Requirement**) and `spctl --assess --type execute
--verbose=2` (**accepted**, **source=Apple System**). The app was moved only
after checking the guest destination did not exist, and normal launch was
requested:

```sh
codesign --verify --deep --strict --verbose=2 Xcode.app
spctl --assess --type execute --verbose=2 Xcode.app
test ! -e /Applications/Xcode.app && mv Xcode.app /Applications/Xcode.app
open /Applications/Xcode.app
```

Normal guest launch succeeded and visibly displayed the **Xcode and Apple SDKs
Agreement**. License acceptance is awaiting the owner's action-time approval;
it has not been accepted by the agent. First-launch completion, runtime
installation, and legacy boot verification remain pending at this checkpoint.

### Handoff to the guest ChatGPT instance

The owner installed ChatGPT inside the guest and explicitly requested transfer
of the remaining effort to its **Install iPadOS 15.4 simulator** conversation.
At inspection, Xcode's Welcome and Settings windows were visible. Its Downloads
window showed **iOS 15.4 Universal Simulator (19E240)** downloading, **2.8 GB of
5.41 GB (52%)**. This was a live guest observation, not proof of installation
or boot. The owner or guest instance had progressed beyond the earlier license
checkpoint; the host agent did not observe or perform that acceptance.

The host agent added a technical handoff to the existing read-only installer
share at:

```text
<shared-installers>/LEGACY-SIMULATOR-HANDOFF.md
```

Its host path is
`<HOME>/Downloads/LOTTO-Simulator-Setup/Guest-Installers/LEGACY-SIMULATOR-HANDOFF.md`.
The handoff contains the verified guest/Xcode setup, already-downloaded runtime,
exact runtime and mini 4 identifiers, host preservation boundaries, and required
home-screen/Safari evidence and repeatable documentation. A follow-up message
was submitted to that guest conversation; its response acknowledged reading
the handoff and continuing with the download and iPad mini 4 verification.
The guest then displayed Finder-access and screen-recording permission prompts
for the owner to handle. The host agent stopped driving the guest after handoff
to avoid competing input. Further guest results must be brought back before
this record can claim successful legacy-runtime boot.

To repeat VM creation in UTM 4.7.5:

1. Choose **Create → Virtualize → macOS 12+**.
2. Set memory to **32768 MiB**, CPU cores to **8**, and select the verified
   `UniversalMac_26.6.2_25G83_Restore.ipsw` from the setup-assets directory.
3. Set storage to **160 GiB**, name the VM **LOTTO-iPadOS15.4-macOS26**, and
   select **Open VM Settings** before saving.
4. Under **Sharing**, add only the `Guest-Installers` directory and enable
   **Read Only**. Under **Virtualization**, disable sound and clipboard sharing.
5. Save, then use UTM's **Move** action to place the newly created VM in
   `<HOME>/VirtualMachines/LOTTO-Legacy-Testing/`.
6. Choose **Run** and approve installing macOS on this empty guest disk.
   This installation confirmation erases the VM's primary disk, so reusing an
   existing VM requires preserving its contents first.
7. Continue Setup Assistant with **English**, **United States**, and **Set up
   as new**. Accept Apple's macOS license only after the owner approves it.
   Create the separate local testing account with a password entered by the
   owner. No host data migration is required for this workflow.

### Original candidate and acceptance boundary

The next candidate is macOS 26 with Xcode 26, either in a compatible Apple
Silicon VM or on another compatible startup volume/Mac. No VM or alternate
macOS installation had been created during the initial host-only attempt. The
candidate remains unverified until it passes the runtime-availability and boot
checks.

A working setup must visibly show **iPad mini 4 / iOS 15.4**, reach the home
screen, and open responsive Safari. A modern-runtime simulator window or an
Xcode Welcome window is not that result. Then test the built LOTTO application
and its interactive controls; verify sign-in on a preview and retain the
physical iPadOS 15.8 release gate.

See [Browser Support](BROWSER_SUPPORT.md) for the development-only WebSocket
shim, manual-refresh requirement on iOS 15, production bundle checks and build
cleanup. No LOTTO build, application test, preview deployment, runtime patch,
CoreSimulator replacement, or global developer-tool change was performed here.

## Reference

[Apple's Xcode compatibility table](https://developer.apple.com/xcode/system-requirements)
lists the supported host and simulator ranges. The local error and UI observations
above are the evidence for this particular machine; recheck after OS or tool updates.
