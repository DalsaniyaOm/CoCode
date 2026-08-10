// server/routes/execute.js
const express = require('express');
const router = express.Router();
const vm = require('vm'); // Node's built-in Virtual Machine module
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res) => {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
        return res.status(400).json({ message: "No code provided to execute." });
    }

    // Our local sandbox will only execute JavaScript
    if (language !== 'javascript') {
        return res.status(400).json({ message: "Only JavaScript execution is supported in this environment." });
    }

    try {
        // 1. Create an array to catch anything the user tries to console.log
        let outputBuffer = [];
        
        // 2. Build a fake 'console' object to inject into the sandbox
        const sandbox = {
            console: {
                log: (...args) => outputBuffer.push(args.join(' ')),
                error: (...args) => outputBuffer.push(args.join(' ')),
                warn: (...args) => outputBuffer.push(args.join(' ')),
                info: (...args) => outputBuffer.push(args.join(' '))
            }
        };

        // 3. Create the isolated environment and run the code!
        // We set a 3000ms (3 second) timeout so infinite loops don't crash your server!
        vm.createContext(sandbox);
        vm.runInContext(code, sandbox, { timeout: 3000 });

        // 4. Send the captured output back to the React frontend
        res.status(200).json({
            output: outputBuffer.join('\n') || "Execution finished with no output.",
            code: code
        });

    } catch (error) {
        // If the user writes bad code (like a syntax error), we catch it here
        // We send it back as a 200 OK so it prints natively in the terminal UI
        res.status(200).json({
            output: `Error: ${error.message}`,
            code: code
        });
    }
});

module.exports = router;