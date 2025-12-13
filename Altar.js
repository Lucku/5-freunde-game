class Altar {
    constructor() {
        this.container = document.getElementById('altar-content');
    }

    render() {
        this.container.innerHTML = '';

        // 1. Render Hero Columns
        const heroes = ['fire', 'water', 'ice', 'plant', 'metal', 'black'];

        heroes.forEach(hero => {
            const col = document.createElement('div');
            col.className = 'altar-column';
            col.style.cssText = `
                background: rgba(255,255,255,0.05); 
                padding: 15px; 
                border-radius: 10px; 
                width: 300px; 
                display: flex; 
                flex-direction: column; 
                gap: 10px;
                border: 1px solid #333;
            `;

            // Header
            const prestige = saveData[hero].prestige || 0;
            const color = BASE_HERO_STATS[hero].color;
            col.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:10px; margin-bottom:10px;">
                    <h2 style="color:${color}; margin:0;">${hero.toUpperCase()}</h2>
                    <span style="color:#aaa; font-size:14px;">Prestige: <span style="color:#fff">${prestige}</span></span>
                </div>
            `;

            // Nodes
            const nodes = ALTAR_TREE[hero];
            nodes.forEach(node => {
                const isUnlocked = prestige >= node.req;
                const isActive = saveData.altar.active.includes(node.id);

                const nodeEl = document.createElement('div');
                nodeEl.className = `altar-node ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'active' : ''}`;
                nodeEl.style.cssText = `
                    padding: 10px;
                    background: ${isUnlocked ? (isActive ? 'rgba(46, 204, 113, 0.2)' : 'rgba(0,0,0,0.3)') : 'rgba(0,0,0,0.5)'};
                    border: 1px solid ${isUnlocked ? (isActive ? '#2ecc71' : '#555') : '#333'};
                    border-radius: 5px;
                    cursor: ${isUnlocked ? 'pointer' : 'default'};
                    opacity: ${isUnlocked ? 1 : 0.5};
                    transition: all 0.2s;
                `;

                nodeEl.innerHTML = `
                    <div style="font-weight:bold; color:${isUnlocked ? '#fff' : '#777'}; font-size:14px;">
                        ${isUnlocked ? (isActive ? '✅ ' : '⬜ ') : '🔒 '} Rank ${node.req}
                    </div>
                    <div style="font-size:12px; color:#aaa; margin-top:5px;">${node.desc}</div>
                `;

                if (isUnlocked) {
                    nodeEl.onclick = () => this.toggleNode(node.id);
                }

                col.appendChild(nodeEl);
            });

            this.container.appendChild(col);
        });

        // 2. Render Convergence (Shared Mutations)
        const convCol = document.createElement('div');
        convCol.className = 'altar-column';
        convCol.style.cssText = `
            background: rgba(155, 89, 182, 0.1); 
            padding: 15px; 
            border-radius: 10px; 
            width: 100%; 
            display: flex; 
            flex-direction: column; 
            gap: 10px;
            border: 1px solid #8e44ad;
            margin-top: 20px;
        `;

        convCol.innerHTML = `
            <div style="border-bottom:1px solid #8e44ad; padding-bottom:10px; margin-bottom:10px;">
                <h2 style="color:#9b59b6; margin:0;">CONVERGENCE (Shared Mutations)</h2>
                <div style="color:#aaa; font-size:12px;">Requires Prestige 5 on BOTH heroes.</div>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:15px;">
        `;

        const convNodes = ALTAR_TREE.convergence;
        const nodesContainer = document.createElement('div');
        nodesContainer.style.cssText = "display:flex; flex-wrap:wrap; gap:15px; width:100%;";

        convNodes.forEach(node => {
            const reqs = Object.keys(node.req);
            const isUnlocked = reqs.every(h => (saveData[h].prestige || 0) >= node.req[h]);
            const isActive = saveData.altar.active.includes(node.id);

            const nodeEl = document.createElement('div');
            nodeEl.style.cssText = `
                padding: 10px;
                background: ${isUnlocked ? (isActive ? 'rgba(155, 89, 182, 0.3)' : 'rgba(0,0,0,0.3)') : 'rgba(0,0,0,0.5)'};
                border: 1px solid ${isUnlocked ? (isActive ? '#9b59b6' : '#555') : '#333'};
                border-radius: 5px;
                cursor: ${isUnlocked ? 'pointer' : 'default'};
                opacity: ${isUnlocked ? 1 : 0.5};
                width: 300px;
            `;

            const reqText = reqs.map(h => `${h.toUpperCase()} ${node.req[h]}`).join(' + ');

            nodeEl.innerHTML = `
                <div style="font-weight:bold; color:${isUnlocked ? '#fff' : '#777'}; font-size:14px;">
                    ${isUnlocked ? (isActive ? '✅ ' : '⬜ ') : '🔒 '} ${reqText}
                </div>
                <div style="font-size:12px; color:#aaa; margin-top:5px;">${node.desc}</div>
            `;

            if (isUnlocked) {
                nodeEl.onclick = () => this.toggleNode(node.id);
            }
            nodesContainer.appendChild(nodeEl);
        });

        convCol.appendChild(nodesContainer);
        this.container.appendChild(convCol);
    }

    toggleNode(id) {
        const index = saveData.altar.active.indexOf(id);
        if (index === -1) {
            saveData.altar.active.push(id);
        } else {
            saveData.altar.active.splice(index, 1);
        }
        saveGame();
        this.render();
    }
}
