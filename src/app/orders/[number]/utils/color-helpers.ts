/**
 * Helper function to get color hex/rgb from color name
 * @param colorName - Color name (e.g., "red", "blue")
 * @returns Hex color value (e.g., "#FF0000")
 */
export function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    'beige': '#F5F5DC',
    'black': '#000000',
    'blue': '#0000FF',
    'brown': '#A52A2A',
    'gray': '#808080',
    'grey': '#808080',
    'green': '#008000',
    'red': '#FF0000',
    'white': '#FFFFFF',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'navy': '#000080',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080',
    'cyan': '#00FFFF',
    'magenta': '#FF00FF',
    'lime': '#00FF00',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
  };
  
  const normalizedName = colorName.toLowerCase().trim();
  return colorMap[normalizedName] || '#CCCCCC'; // Default gray if color not found
}




