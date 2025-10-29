class InfoPage {
    constructor() {
        this.run();
    }

    run() {
        this.initializeUI();
    }
    
    initializeUI() {
        const template = `
            <div class="container">
                <div class="card">
                    <h1>About Leaguescape</h1>
                    <p>Welcome to Leaguescape, a digital companion to your escape room experience.</p>
                    
                    <h2>How It Works</h2>
                    <ul>
                        <li>Create or join a game session</li>
                        <li>Take on the role of a character</li>
                        <li>Earn and manage gold</li>
                        <li>Purchase items from the shop</li>
                        <li>Use items to solve puzzles in the physical escape room</li>
                    </ul>

                    <h2>Roles</h2>
                    <h3>Game Admin</h3>
                    <p>As an admin, you can:</p>
                    <ul>
                        <li>Create and manage games</li>
                        <li>Set up character profiles</li>
                        <li>Manage the item shop</li>
                        <li>Monitor player activities</li>
                    </ul>

                    <h3>Player</h3>
                    <p>As a player, you can:</p>
                    <ul>
                        <li>Join existing games</li>
                        <li>Log in as a character</li>
                        <li>Purchase items from the shop</li>
                        <li>Manage your inventory</li>
                    </ul>

                    <div class="form-group">
                        <a href="/" class="btn">Back to Login</a>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelector('#app').innerHTML = template;
    }
}

export default new InfoPage();