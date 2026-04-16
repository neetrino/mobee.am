/** Product definitions for seed-figma-products.cjs (Figma node 53:684). */
const SLUGS = ["iphone-15-pro", "ipad-air-m2", "ipad-pro-m4", "iphone-15"];

const COLOR_SPECS = [
  { value: "silver", position: 0, colors: ["#E5E7EB", "#9CA3AF"], labels: { en: "Silver", hy: "Արծաթ", ru: "Серебристый" } },
  { value: "sky", position: 1, colors: ["#93C5FD", "#3B82F6"], labels: { en: "Blue", hy: "Կապույտ", ru: "Синий" } },
  { value: "yellow", position: 2, colors: ["#FDE047", "#CA8A04"], labels: { en: "Yellow", hy: "Դեղին", ru: "Жёлтый" } },
  { value: "navy", position: 3, colors: ["#1E3A8A", "#172554"], labels: { en: "Navy", hy: "Խավար կապույտ", ru: "Тёмно-синий" } },
];

const PRODUCTS = [
  {
    slug: "iphone-15-pro",
    brandSlug: "apple-iphone-line",
    categorySlug: "iphone",
    price: 999,
    compareAt: 1099,
    stock: 24,
    label: { value: "ՆՈՐ", color: "#2db2ff" },
    translations: {
      en: {
        title: "iPhone 15 Pro",
        subtitle: "A17 Pro Chip",
        descriptionHtml:
          "<p><strong>Highlights</strong></p><ul><li>A17 Pro chip, 6-core GPU</li><li>Titanium, Action button</li><li>Pro camera (48MP)</li><li>Super Retina XDR</li><li>USB-C (USB 3)</li></ul>",
      },
      hy: {
        title: "iPhone 15 Pro",
        subtitle: "A17 Pro չիպ",
        descriptionHtml:
          "<p><strong>Հիմնական</strong></p><ul><li>A17 Pro չիպ</li><li>Տիտանե, Action կոճակ</li><li>Pro տեսախցիկ 48MP</li><li>Super Retina XDR</li><li>USB-C</li></ul>",
      },
      ru: {
        title: "iPhone 15 Pro",
        subtitle: "Чип A17 Pro",
        descriptionHtml:
          "<p><strong>Основное</strong></p><ul><li>Чип A17 Pro, 6‑ядерный GPU</li><li>Титан, кнопка Action</li><li>Камера Pro 48 Мп</li><li>Super Retina XDR</li><li>USB‑C</li></ul>",
      },
    },
  },
  {
    slug: "ipad-air-m2",
    brandSlug: "apple-ipad-line",
    categorySlug: "ipad",
    price: 599,
    compareAt: 699,
    stock: 40,
    label: { value: "Առկա", color: "#16a34a" },
    translations: {
      en: {
        title: "iPad Air (M2)",
        subtitle: "M2 Performance",
        descriptionHtml:
          "<p><strong>Highlights</strong></p><ul><li>Apple M2</li><li>Liquid Retina</li><li>Touch ID</li><li>Apple Pencil & Magic Keyboard</li><li>All-day battery</li></ul>",
      },
      hy: {
        title: "iPad Air (M2)",
        subtitle: "M2 կատարում",
        descriptionHtml:
          "<p><strong>Հիմնական</strong></p><ul><li>Apple M2</li><li>Liquid Retina</li><li>Touch ID</li><li>Pencil & Magic Keyboard</li><li>Բաթարե ամբողջ օրվա համար</li></ul>",
      },
      ru: {
        title: "iPad Air (M2)",
        subtitle: "Производительность M2",
        descriptionHtml:
          "<p><strong>Основное</strong></p><ul><li>Apple M2</li><li>Liquid Retina</li><li>Touch ID</li><li>Pencil и Magic Keyboard</li><li>Аккумулятор на день</li></ul>",
      },
    },
  },
  {
    slug: "ipad-pro-m4",
    brandSlug: "apple-ipad-line",
    categorySlug: "ipad",
    price: 999,
    compareAt: 1149,
    stock: 18,
    label: { value: "Թոփ", color: "#ea580c" },
    translations: {
      en: {
        title: "iPad Pro (M4)",
        subtitle: "M4 Desktop-class",
        descriptionHtml:
          "<p><strong>Highlights</strong></p><ul><li>Apple M4</li><li>Ultra Retina XDR (Tandem OLED)</li><li>ProRes, ray tracing</li><li>Thunderbolt / USB 4</li><li>Pencil Pro & Magic Keyboard</li></ul>",
      },
      hy: {
        title: "iPad Pro (M4)",
        subtitle: "M4 Desktop-դաս",
        descriptionHtml:
          "<p><strong>Հիմնական</strong></p><ul><li>Apple M4</li><li>Ultra Retina XDR</li><li>ProRes</li><li>Thunderbolt / USB 4</li><li>Pencil Pro</li></ul>",
      },
      ru: {
        title: "iPad Pro (M4)",
        subtitle: "Класс настольных ПК на M4",
        descriptionHtml:
          "<p><strong>Основное</strong></p><ul><li>Apple M4</li><li>Ultra Retina XDR</li><li>ProRes</li><li>Thunderbolt / USB 4</li><li>Pencil Pro</li></ul>",
      },
    },
  },
  {
    slug: "iphone-15",
    brandSlug: "apple-iphone-line",
    categorySlug: "iphone",
    price: 799,
    compareAt: 899,
    stock: 32,
    label: null,
    translations: {
      en: {
        title: "iPhone 15",
        subtitle: "48MP Main Camera",
        descriptionHtml:
          "<p><strong>Highlights</strong></p><ul><li>A16 Bionic</li><li>Dynamic Island</li><li>48MP camera, 2x Telephoto</li><li>USB-C</li><li>Color-infused glass</li></ul>",
      },
      hy: {
        title: "iPhone 15",
        subtitle: "48MP հիմնական տեսախցիկ",
        descriptionHtml:
          "<p><strong>Հիմնական</strong></p><ul><li>A16 Bionic</li><li>Dynamic Island</li><li>48MP, 2x Telephoto</li><li>USB-C</li><li>Ապակե հետևի մաս</li></ul>",
      },
      ru: {
        title: "iPhone 15",
        subtitle: "Основная камера 48 Мп",
        descriptionHtml:
          "<p><strong>Основное</strong></p><ul><li>A16 Bionic</li><li>Dynamic Island</li><li>48 Мп, 2x Telephoto</li><li>USB‑C</li><li>Стеклянная задняя панель</li></ul>",
      },
    },
  },
];

module.exports = { SLUGS, COLOR_SPECS, PRODUCTS };
