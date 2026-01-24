export async function interpretPromptToJson(promptText, mode = "chat", retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch("http://localhost:3002/api/interpret", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: promptText, mode }),
            });

            if (res.status === 500 && i < retries - 1) {
                await new Promise(r => setTimeout(r, 800)); // Wait & Retry
                continue;
            }

            if (!res.ok) {
                let errText = await res.text();
                throw new Error(`Server ${res.status}: ${errText}`);
            }

            const data = await res.json();
            return data.json ?? null;

        } catch (err) {
            console.warn(`Attempt ${i + 1} failed: ${err.message}`);
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
}
