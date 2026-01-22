class SaveManager {
    static encodeSaveData(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Simple obfuscation: Base64(JSON)
            return btoa(unescape(encodeURIComponent(jsonString)));
        } catch (e) {
            console.error("Failed to encode save data:", e);
            return null;
        }
    }

    static decodeSaveData(encodedString) {
        try {
            // Check if it's old format (JSON)
            if (encodedString.trim().startsWith('{')) {
                return JSON.parse(encodedString);
            }
            // Assume new format (Base64)
            const jsonString = decodeURIComponent(escape(atob(encodedString)));
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to decode save data:", e);
            return null;
        }
    }

    static saveGame(data) {
        if (!data) return;

        const encodedData = this.encodeSaveData(data);
        if (!encodedData) return;

        if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
            try {
                fs.writeFileSync(saveFilePath, encodedData);
            } catch (e) {
                console.error("Failed to save game to disk:", e);
            }
        } else {
            // Fallback for Web Browser
            localStorage.setItem('5FreundeSave', encodedData);
        }

        console.log("Game Saved Successfully");
    }

    static loadGame(defaultSaveData) {
        let data = null;

        if (typeof isElectron !== 'undefined' && isElectron && typeof fs !== 'undefined') {
            try {
                if (fs.existsSync(saveFilePath)) {
                    const raw = fs.readFileSync(saveFilePath, 'utf8');
                    data = this.decodeSaveData(raw);
                }
            } catch (e) {
                console.error("Failed to load save file:", e);
            }
        } else {
            // Fallback for Web Browser
            const raw = localStorage.getItem('5FreundeSave');
            if (raw) data = this.decodeSaveData(raw);
        }

        if (data) {
            // Merge loaded data with default structure
            const merged = { ...defaultSaveData, ...data, global: { ...defaultSaveData.global, ...data.global } };

            // Migrations
            if (!merged.story) merged.story = { unlockedChapters: [], enabled: true };
            else if (merged.story.enabled === undefined) merged.story.enabled = true;

            if (!merged.altar) merged.altar = { active: [] };
            if (!merged.weekly) merged.weekly = { lastCompleted: null };

            return merged;
        } else {
            return JSON.parse(JSON.stringify(defaultSaveData));
        }
    }

    static exportSave(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'freunde_savegame.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    static importSave(file, callback) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const json = JSON.parse(e.target.result);
                // Basic validation
                if (json.global && json.unlocks) {
                    callback(json);
                } else {
                    alert("Invalid save file format!");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to parse save file.");
            }
        };
        reader.readAsText(file);
    }
}
