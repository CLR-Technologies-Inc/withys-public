# Meadows on Linux

The Linux Tauri configuration names the window **Withys Meadows** and uses
`co.clrtechnologies.Meadows` for the application ID and installed executable.
The ID is based on the publisher's domain, clrtechnologies.co.

For an installation from source, install the built executable on PATH with that
name. Run `sh app/src-tauri/linux/install-desktop.sh` from the repository
root to install its XDG launcher, software-center metadata and leaf icon.
Set `PREFIX` and `DESTDIR` to match the binary's installation.
The PNG is a 512-pixel RGBA export of `app/public/brand/app-icon-512.svg`.

The previous development wrapper used the generic ID `com.tauri.dev`. The
new identity can open a separate WebKit storage profile. Keep the old profile
and its original build available when testing upgrades with existing data.
If you previously saved provider keys in that build, open its Settings and clear each saved key there. A new profile cannot clear the old one. Test journal recovery with fictional data before distributing a stable release.
