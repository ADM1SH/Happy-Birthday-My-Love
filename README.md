# Interactive 3D Birthday Celebration

## Description

This project is a web-based, interactive 3D birthday card created to celebrate a special occasion. It features a beautifully rendered scene with a birthday cake, a candle that can be extinguished, and a celebratory animation sequence. The experience is built using modern web technologies to create an immersive and personal greeting.

## Features

*   **Interactive 3D Scene:** A fully 3D environment built with Three.js, allowing the user to navigate and interact with the scene.
*   **Dynamic Lighting:** The scene is lit with ambient light, colored point lights, and a flickering candle flame that casts shadows.
*   **Blow Out the Candle:** Users can extinguish the candle's flame either by clicking on it or by using their microphone to simulate blowing.
*   **Celebration Sequence:** Once the candle is out, a celebration is triggered, featuring confetti, glowing elements, and a personalized message.
*   **Audio Integration:** The experience includes background music that can be toggled on or off, along with sound effects for key interactions.
*   **Responsive Design:** The experience adjusts certain visual parameters for better performance on mobile devices.

## Technologies Used

*   **HTML5:** The core structure of the web page.
*   **CSS3:** For styling the user interface elements.
*   **JavaScript (ES6+):** The primary language for the application logic and interactivity.
*   **Three.js:** A cross-browser JavaScript library and API used to create and display animated 3D computer graphics in a web browser.
*   **GSAP (GreenSock Animation Platform):** A robust JavaScript library for creating high-performance animations.

## Local Development

To run this project on your local machine, you need to serve the files using a local web server. You cannot simply open the `index.html` file directly in your browser due to browser security policies related to ES6 modules.

1.  **Clone the repository or download the source code.**

2.  **Navigate to the project directory in your terminal:**
    ```sh
    cd path/to/Happy-Birthday-My-Love
    ```

3.  **Start a local web server.** If you have Python installed, you can use its built-in server.

    For Python 3:
    ```sh
    python -m http.server
    ```

    For Python 2:
    ```sh
    python -m SimpleHTTPServer
    ```

4.  **Open your web browser** and navigate to the address provided by the server (usually `http://localhost:8000`).

## Project Structure

```
.
├── assets/
│   ├── audio/         # Sound effects and background music
│   └── ...
├── css/
│   └── style.css      # Main stylesheet
├── js/
│   └── main.js        # Core application logic with Three.js
└── index.html         # The main HTML file
```

## Customization

The project can be personalized by modifying the `js/main.js` file:

*   **Age:** In the `startCelebration` function, you can change the text '18' in the `TextGeometry` constructor to any other age.
*   **Final Message:** In the same function, modify the `textContent` of the `finalMsg` element to change the birthday message.
*   **Photos:** The photo frames are currently placeholders. You can apply textures to the `photoFrames` array of meshes to display custom images. To do this, you would use the `TextureLoader` from Three.js to load your images and then apply them as a `map` to the material of each photo frame.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
