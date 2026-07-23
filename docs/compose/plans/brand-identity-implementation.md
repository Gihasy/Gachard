# Rencana Implementasi Brand Identity Gachard

> **Sumber:** `D:\Gachard Project\aab624a2-d8ef-4397-80b5-091ae1d819cf.png`

---

## 1. Color Palette

| Nama | Hex | Penggunaan |
|---|---|---|
| Cosmic Violet | `#B8ACFF` | Primary accent, card borders, glow |
| Aurora Pink | `#FF6BBA` | CTA buttons, highlights, rarity tags |
| Electric Blue | `#00CCFF` | Secondary accent, glow effects |
| Aurora Gold | `#FFC466` | Tagline, premium elements, stats |
| Deep Navy | `#0B0E1A` | Background utama |
| Silver Mist | `#E6E8F0` | Body text, icon strokes |

**Gradient CTA:** `linear-gradient(135deg, #FF6BBA, #00CCFF)`

---

## 2. Typography

| Font | Penggunaan | Contoh |
|---|---|---|
| **Gachard Display** | Headlines, logo wordmark | "COLLECT. PLAY. TRADE." |
| **Inter** | Body text, UI labels, navigation | Deskripsi, tombol |

- Headlines: UPPERCASE, letter-spacing -120
- Body: sentence case, normal spacing

---

## 3. Perubahan yang Diperlukan

### 3.1 CSS Variables (`globals.css`)

```css
:root {
  --cosmic-violet: #B8ACFF;
  --aurora-pink: #FF6BBA;
  --electric-blue: #00CCFF;
  --aurora-gold: #FFC466;
  --deep-navy: #0B0E1A;
  --silver-mist: #E6E8F0;
  --cta-gradient: linear-gradient(135deg, #FF6BBA, #00CCFF);
}
```

### 3.2 Navbar

- Background: Deep Navy dengan subtle border
- Logo: Gachard wordmark (atau font mirip)
- Links: Silver Mist, uppercase
- Login button: CTA gradient (pink→blue), pill shape

### 3.3 Home Page

- Background: Deep Navy
- Hero: "COLLECT. PLAY. TRADE." — besar, putih, Gachard Display
- Tagline: "Collect. Play. Trade." — Aurora Gold
- CTA buttons: "EXPLORE CARDS" (gold), "PLAY NOW" (ghost)
- Stats: `12K+ COLLECTORS | 45K+ CARDS MINTED` — angka Aurora Gold, label Silver Mist

### 3.4 Card Display

- Rarity glow: Common=none, Rare=Electric Blue, Epic=Cosmic Violet, Legendary=Aurora Gold
- Card border: sesuai rarity color
- Background: Deep Navy

### 3.5 Buttons

- **Primary CTA:** Gradient pink→blue, pill shape, white text
- **Secondary:** Transparent + white border, pill shape
- **Gold CTA:** Aurora Gold background, dark text

### 3.6 Rarity Tags

- Common: Silver Mist border
- Rare: Electric Blue border + text
- Epic: Cosmic Violet border + text
- Legendary: Aurora Gold border + text

---

## 4. Implementasi Tasks

| # | Task | File |
|---|---|---|
| 1 | Update CSS variables | `globals.css` |
| 2 | Restyle Navbar | `components/Navbar.tsx` |
| 3 | Restyle Home page | `app/page.tsx` |
| 4 | Restyle PackCard | `components/PackCard.tsx` |
| 5 | Restyle CardItem | `components/CardItem.tsx` |
| 6 | Restyle TopUp page | `app/topup/page.tsx` |
| 7 | Restyle Scan page | `app/scan/page.tsx` |
| 8 | Restyle buttons global | `globals.css` |

---

## 5. Font Strategy

**Gachard Display** — custom font, belum tersedia. Opsi:
- Gunakan **Inter** untuk sementara (sudah terinstall)
- Atau cari font mirip: **Space Grotesk**, **Exo 2**, atau **Orbitron**
- Untuk hackathon demo, Inter bold + uppercase sudah cukup

---

*Rencana ini untuk review sebelum implementasi.*
