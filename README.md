## Mr. Bingo – Neurodivergent‑friendly Learning Companion

Mr. Bingo is a **cute, responsive React + Tailwind CSS experience** that showcases an AI‑powered, gamified learning platform for neurodivergent children, their parents, and therapists.

### Tech stack

- **React 18 + Vite**
- **Tailwind CSS 3**
- **Framer Motion** for soft, floating animations

### Running the project

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Open the printed local URL (typically `http://localhost:5173`) in your browser.

### App structure

- **Landing page**  
  - Soft pastel palette (baby blue, mint green, soft yellow, lavender).  
  - Large animated `MrBingoCharacter` in the center with floating stars, clouds, and blobs via `FloatingBackground`.  
  - Two large rounded buttons:
    - **“I am a Child 👶”** → switches to Child Mode.
    - **“I am a Parent / Therapist 👩‍⚕️”** → switches to Parent/Therapist dashboard.

- **Child Mode (`ChildMode` component)**  
  - Very colourful, rounded UI built with Tailwind.  
  - Big accessible cards:
    - **Start Adventure**
    - **Daily Challenge**
    - **My Stars**  
  - Mr. Bingo appears with a friendly speech bubble.  
  - Gamified **star reward bar** showing current level and progress.  
  - Minimal text, icon‑based navigation cues, large tap targets for children.

- **Parent / Therapist Mode (`ParentDashboard` component)**  
  - Clean, professional **sidebar dashboard layout**.  
  - Sections:
    - **Child Progress Analytics** – placeholder bar‑chart style component.
    - **Assigned Activities** – list of sample activities and statuses.
    - **Performance Reports** – simple controls for exporting PDF/CSV (placeholders).  
  - Warmer than a typical SaaS dashboard but still clearly adult‑oriented.

### Accessibility & inclusion notes

- **Child‑friendly typography**: rounded `Baloo 2` font, high legibility.  
- **Pastel, low‑stim colours** with sufficient contrast for text.  
- Large buttons, generous spacing, and clear focus rings.  
- Minimal on‑screen text in Child Mode; more detail and analytics in Parent Mode.  
- No flashing animations or rapid motion—Framer Motion uses **slow, gentle floating**.

This project is intentionally front‑end only and can be used as a starting point for wiring in real AI‑driven content, authentication, and data storage.

