# End-to-End Testing Guide for Synkio CLI v2

This guide provides step-by-step instructions to test the full end-to-end workflow of the Synkio CLI using a mock Figma API server. This allows you to verify the CLI's functionality without needing real Figma credentials or a pre-existing Figma file.

---

### Step 1: Start the Mock Figma API Server

First, you need to start the mock server. This server will act as a fake Figma API for the CLI to talk to.

**Open a new terminal window** and run the following command from the root of the `synkio` repository:

```bash
node synkio-v2/test-utils/mock-figma-server.cjs
```

You should see a message: `Mock Figma API server listening on http://localhost:8080`. Keep this terminal open and running.

---

### Step 2: Set up the Example Project

Now, in your original terminal, you will initialize the example project and configure it to talk to the mock server.

1.  **Navigate into the example project directory:**
    If you haven't created the `example-project` yet, create it and `cd` into it:
    ```bash
    mkdir example-project
    cd example-project
    ```
    If you have already run `synkio init` in this directory, you can skip to step 3.

2.  **Initialize the project:** Run the `synkio init` command with flags pointing to our mock server. This creates `tokensrc.json` and a `.env` file within the `example-project` directory.
    ```bash
    synkio init --figma-url=https://www.figma.com/file/test-file-id --token=dummy-token --output-dir=src/tokens --base-url=http://localhost:8080
    ```
    This step should succeed without any errors.

---

### Step 3: Run the Sync and Verify Results

You are now ready to run the core command and see the CLI in action.

1.  **Make sure you are still in the `example-project` directory.**

2.  **Run the `sync` command:**
    ```bash
    synkio sync
    ```
    You should see a success message similar to: `✓ Sync complete. Wrote 2 token files to src/tokens.`.

3.  **Inspect the created files:**
    You can now verify that the token files were created correctly.
    *   **List the created files:**
        ```bash
        ls -R src/tokens
        ```
        This should show `colors.json` and `spacing.json` inside the `src/tokens` directory.
    *   **View the contents of one of the files:**
        ```bash
        cat src/tokens/colors.json
        ```
        This will display the processed JSON structure for the color tokens that came from the mock API.

---

### Cleaning Up

When you are finished with testing, you can stop the mock server by pressing `Ctrl+C` in the terminal where it is running. You can also remove the `example-project` directory:

```bash
rm -rf example-project
```
