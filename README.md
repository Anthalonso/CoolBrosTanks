# Cool Bros Tanks 🎮

A web-based 2D turn-based artillery game inspired by Scorched Earth. Players control tanks and must destroy opponents using physics-based projectile weapons.

## 🎯 Features

- **Full Menu System**: Choose 2-8 players with customizable AI difficulty
- **5 Unique Maps**: Flat Plains, Rolling Hills, Mountain Range, Canyon, Plateau
- **3 Weapon Types**:
  - **Missile**: 100 direct damage, 80 splash damage, 70px radius
  - **Cluster Bomb**: Splits into 5 sub-projectiles, 110 max damage
  - **Bouncing Round**: 60 damage, bounces 3 times, 180 max damage
- **Ricochet Physics**: Projectiles bounce off screen edges
- **AI Opponents**: Easy, Normal, and Hard difficulty levels
- **Dynamic Terrain Destruction**: Create craters with explosions
- **Fall Damage**: Tanks take damage when terrain collapses

## 🎮 How to Play

### Controls
- **Arrow Keys**: Adjust angle (left/right) and power (up/down)
- **Space**: Fire weapon
- **1/2/3**: Select weapon type
- **P**: Pause game
- **ESC**: Return to main menu
- **R**: Restart (on game over screen)

### Menu Navigation
1. **Select Players**: Choose 2-8 players
2. **Configure AI**: Set each player as Human or AI (Easy/Normal/Hard)
3. **Select Map**: Pick from 5 different terrain types
4. **Start Game**: Begin the battle!

## 🚀 Play Online

[Play Cool Bros Tanks](https://yourusername.github.io/CoolBrosTanks/)

## 💻 Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/CoolBrosTanks.git
   cd CoolBrosTanks
   ```

2. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser to `http://localhost:8000`

## 🎯 Game Rules

- Players take turns shooting at each other
- Last tank standing wins
- Game ends if all human players are eliminated
- Only one shot per turn
- Tanks take fall damage when terrain is destroyed beneath them

## 🛠️ Technical Details

- **Technology**: HTML5 Canvas with vanilla JavaScript
- **Resolution**: 1200x600 pixels
- **Physics**: Gravity-based ballistic trajectories with ricochet mechanics
- **No Dependencies**: Pure JavaScript, no frameworks required

## 📝 License

This project is open source and available for anyone to play and modify.

## 🤝 Credits

Built with assistance from Claude Sonnet 4.5
