# Windows: fix FFmpeg/ffprobe video upload errors

The video server must have FFmpeg and FFprobe. Installing a browser extension does not provide them. If MindMitra runs on your Windows laptop, install them on that laptop.

## Recommended command

Open PowerShell **inside the updated MindMitra folder** and run:

```powershell
npm run setup:media -- --install
```

This checks both programs, then uses Windows Package Manager to install `Gyan.FFmpeg` if needed. Windows may request administrator approval. The same installer provides both executables. The command reports success only after it can actually run each program.

Close/reopen PowerShell, stop the old MindMitra server and start it again. Check with:

```powershell
npm run setup:media
npm run dev
```

For production mode use `npm run build` followed by `npm run start`. Retry the video upload after the app restarts.

## Manual installation for an older source ZIP

```powershell
winget install --id Gyan.FFmpeg -e
```

Reopen PowerShell and verify `ffmpeg -version` and `ffprobe -version`. Then restart MindMitra.

The updated app also discovers standard WinGet/Scoop FFmpeg installations even when the current process's PATH has not refreshed. If a custom installation is outside those locations, set both absolute paths in your private `.env`, for example:

```dotenv
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe
FFPROBE_PATH=C:/ffmpeg/bin/ffprobe.exe
```

Do not include extra shell quotes inside the value. Paths with spaces are supported. Alternatively place both executables and their required distribution files under the project's `tools/ffmpeg/bin/` directory. This local tool directory is ignored by Git and source packaging.

If WinGet is unavailable or restricted, install a trusted Windows FFmpeg distribution manually, configure the paths and run the checker again. The server continues rejecting videos if inspection tools are unavailable; it does not skip validation.

For a remotely hosted application, install/configure these tools on the host instead. The supplied Dockerfile already includes both programs. The private source-download page is only a download page, not the application server.
