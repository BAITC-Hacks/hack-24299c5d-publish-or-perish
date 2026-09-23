# Игровая графика

Изображения созданы встроенным image_gen, без CLI. Все 15 иллюстраций сохранены в assets/art: city.png и 14 отдельных артов мероприятий. Иллюстрация city.png больше не используется: карта игры построена по архивным границам пяти районов муниципального геопортала. Источники и преобразование: [data/MAP-SOURCES.md](data/MAP-SOURCES.md). Для всех 14 мероприятий предусмотрены отдельные SVG-значки в assets/project-icons.js.

Общий стиль: assets/tabletop.css. Подключение картинок, предпросмотр построек и анимации: assets/tabletop.js. Существующие расчётные модули не изменены. Клик на «Ваши решения» / «Проекты города» открывает список. На телефоне рука листается горизонтально; на ноутбуке все карты текущего набора помещаются на экране.

## Первый набор: спецификации промптов

Use case: stylized-concept. Asset type: web city management card game. Для карточек: square illustration, no typography, no card frame, painterly fantasy strategy card game art with chunky brushwork, deep midnight teal shadows and warm golden lighting. No text or logos.

- city.png: Wide landscape 16:10 hand-painted isometric strategy game board of ASTANA Kazakhstan. Miniature city diorama floating within dark midnight teal vignette. Ishim river curves horizontally through center. Baiterek golden sphere in lower central district, Khan Shatyr tent, civic buildings, roads, parkland, ochre trees. Five neighborhoods northwest, north-center, northeast, southwest, south-center. Empty plazas for building tokens. Original painted collectible game art, modern Kazakh architecture, warm golden lamps and sunset, teal shadows, bronze and emerald palette. Entire city visible, high isometric overhead, no text, no labels, no UI or borders.
- transport.png → M3: A gleaming modern turquoise and cream light rail train on curved raised viaduct in Astana, sunset behind Baiterek, blue architectural silhouettes, dynamic three-quarter close view, glowing amber windows, expressive clouds.
- ecology.png → M4: Enchanting city park in Astana, gold and emerald tree canopies, curved turquoise stream, lanterns, stone paths and benches, Baiterek skyline, central lush tree and sun rays.
- social.png → M7: Welcoming ornate school and community clinic campus in Kazakhstan, cream stone, teal domed entrance, golden windows, blooming courtyard, children and families, three-quarter architectural composition.
- safety.png → M10: Safe Astana street at blue hour, ornate golden streetlamp illuminating zebra crossing, small traffic camera, protected pedestrians, trees and blue buildings, deep blue shadows and warm golden halo.
- services.png → M13: Municipal engineer in teal work jacket and bronze hardhat maintaining brass water valve and copper heating pipes, lit city windows, turquoise diagnostic light, warm lamp lighting and bronze textures.

## Остальные карты: полные промпты

### M1.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A turquoise city bus in dedicated golden-lined bus lanes on a beautiful Astana boulevard, dynamic close low three quarter view, golden Baiterek silhouette, commuters and autumn trees, warm afternoon light. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M2.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. An ornate smart traffic signal in the foreground controlling a grand Astana crossroads, vivid emerald lights, faint glowing teal network lines connecting signals, small cars and civic architecture, dusk golden light. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M5.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A cozy neighborhood of modernized small Kazakh houses in snowy Astana, glowing efficient clean heating installation in foreground, crystalline clear air, amber windows and turquoise sky, golden brass pipes and green energy glow, hopeful winter dusk. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M6.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A heroic rows of tall green and golden trees forming windbreaks across an Astana neighborhood, gardener planting a sapling in foreground, warm swirling leaves, golden Baiterek far behind, lush panoramic depth. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M8.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A welcoming modern neighborhood clinic in Astana with warm cream stone and teal architectural roofs, glowing golden entrance, female doctor warmly welcoming a family in foreground, beautiful garden and subtle green medical cross. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M9.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. Beautiful neighborhood outdoor sports court in Astana, children playing basketball and adults exercising on compact outdoor equipment, dynamic basketball hoop foreground, golden sunset, teal buildings and warm trees. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M11.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A beautiful protected school crossing in Astana, broad bright zebra stripes and raised safe pedestrian island, friendly crossing guard with reflective vest guiding children, decorative golden lamps, warm morning light, inviting city background. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M12.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A glowing turquoise civic service terminal in an ornate Astana city hall, helpful female municipal agent handling citizens requests with holographic map and warm brass details, inviting amber lamps, no legible screen text. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

### M14.png

Use case: stylized-concept. Asset: square original collectible city strategy card illustration. A team of two friendly municipal emergency engineers in teal and amber uniforms arriving with repair tools and small service truck on an Astana winter evening, one engineer holding bright lantern, repairing water infrastructure, warm windows behind. Painterly premium card-game illustration with visible beautiful brushwork, cinematic lighting, deep midnight teal shadows, warm amber and bronze highlights, rich gold accents, expressive yet realistic modern Kazakh civic setting. Single clear focal subject, legible at small scale. Fill the square frame. No card frame, no borders, no writing, no logos.

