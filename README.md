# TOEFL Trainer

Practice TOEFL iBT on your Windows PC: full mocks, sections, focused exercises, and saved speaking recordings.

## Start practicing

1. On this GitHub page, click **Code → Download ZIP**.
2. Right-click the downloaded ZIP and choose **Extract All**.
3. Open the extracted folder and double-click **Start TOEFL Trainer.cmd**. Windows may hide the `.cmd` extension.
4. Keep the launcher window open. On the first run it downloads the tools, dependencies and English speech models, then opens your browser.
5. Choose a mock or exercise. For speaking, allow microphone access when asked.

Next time, double-click the same launcher. Close its window when you finish. If a download fails, reconnect to the internet and open it again.

## What you need

- **Windows 10 or 11, 64-bit Intel/AMD**, and an up-to-date **Edge or Chrome** browser. This launcher does not support macOS, Linux or Windows ARM.
- Internet for the first setup and for AI grading, discussion and new exercise generation. Installed practice material, history and recordings work offline.
- The Windows tools **Windows PowerShell**, **curl.exe** and **tar.exe**. These are included with current Windows installations; the launcher tells you if one is missing.
- A microphone for speaking. Windows may also ask permission to install **Microsoft Visual C++ Runtime**, needed by local speech tools.

**You do not need to install Node.js, npm or Python.** The launcher downloads its own Node.js and app dependencies. Speech runs locally without Python.

## Review and improve

After practice, open **Report**. Select a row to see the question, your answer and any recording; use **Previous / Next** to move through responses.

Reading, Listening and Build a Sentence are scored automatically. For extended writing and speaking, connect your account in **Settings → AI trainer**, then use **Grade writing / Grade speaking** on the results page. **Discuss results** asks the trainer to analyze the whole attempt. **Ask about this response** focuses the conversation on one answer.

Exercises offer **Short / Standard / Long** sessions. When fresh material runs low, the app can add checked exercises automatically using your AI account: at most four batches and eight generation/review requests per 24 hours. This pauses during tests and can be switched off in Settings. AI calls use your provider's allowance or API billing. Recordings stay on your computer; the trainer receives relevant text and measurements.

Scores are practice estimates, not official TOEFL results. The scoring method is available on the results page.

## For developers

The launcher also prepares the development dependencies. Run `.work\node-win\npm.cmd test` for tests or `.work\node-win\npm.cmd run build` to check and build the UI. Local tools and build files are generated on this computer and are not stored in Git.
