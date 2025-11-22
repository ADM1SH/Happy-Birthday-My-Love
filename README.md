# Happy Birthday My Love ❤️

A simple and interactive 3D birthday celebration website designed to provide a unique and personal birthday greeting.

## Description

This project is a web-based, interactive 3D birthday card created to celebrate a special occasion. It features a beautifully rendered scene with a birthday cake, a candle that can be extinguished, and a celebratory animation sequence. The experience is built using modern web technologies to create an immersive and personal greeting.

## Features

*   **Interactive 3D Scene:** A fully 3D environment built with Three.js, allowing the user to navigate and interact with the scene.
*   **Dynamic Lighting:** The scene is lit with ambient light and colored point lights.
*   **Blow Out the Candle:** Users can extinguish the candle's flame either by clicking on it or by using their microphone to simulate blowing.
*   **Celebration Sequence:** Once the candle is out, a celebration is triggered, featuring confetti and a personalized message.
*   **Responsive Design:** The experience adjusts certain visual parameters for better performance on mobile devices.

## How to Run

1.  Clone this repository.
2.  Navigate to the project directory.
3.  Start a local web server. For example, using Python:
    ```bash
    python -m http.server
    ```
4.  Open your browser and go to `http://localhost:8000`.

## Project Structure

```
.
├── assets/
│   ├── audio/
│   └── images/
├── css/
│   └── style.css
├── js/
│   └── main.js
├── index.html
└── README.md
```

## Customization

The project can be personalized by modifying the `js/main.js` file:

*   **Age:** In the `startCelebration` function, you can change the text '18' in the `TextGeometry` constructor to any other age.
*   **Final Message:** In the same function, modify the `textContent` of the `finalMsg` and `subMsg` elements to change the birthday message.
*   **Photos:** The photo frames are currently placeholders. You can apply textures to the `photoFrames` array of meshes to display custom images. To do this, you would use the `TextureLoader` from Three.js to load your images and then apply them as a `map` to the material of each photo frame.

## Technologies Used

-   HTML, CSS, JavaScript
-   Three.js
-   GSAP
