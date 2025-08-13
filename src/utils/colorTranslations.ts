// Color translation utility
const colorTranslations: { [key: string]: string } = {
    // Basic colors
    'black': 'أسود',
    'red': 'أحمر',
    'green': 'أخضر',
    'gold': 'ذهبي',
    'golden': 'ذهبي',
    'yellow': 'أصفر',
    'pink': 'وردي',
    'purple': 'بنفسجي',
    'blue': 'أزرق',
    'cyan': 'أزرق سماوي',
    'white': 'أبيض',
    'orange': 'برتقالي',
    'brown': 'بني',
    'gray': 'رمادي',
    'grey': 'رمادي',
    'silver': 'فضي',
    'navy': 'كحلي',
    'maroon': 'كستنائي',
    'lime': 'ليموني',
    'teal': 'فيروزي',
    'indigo': 'نيلي',
    'violet': 'بنفسجي',
    'magenta': 'أرجواني',
    'coral': 'مرجاني',
    'salmon': 'سلمون',
    'turquoise': 'فيروزي',
    'lavender': 'لافندر',
    'olive': 'زيتوني',
    'tan': 'بيج',
    'beige': 'بيج',
    'cream': 'كريمي',
    'ivory': 'عاجي',
    'custom color': 'لون مخصص'
}

export function translateColorName(colorName: string): string {
    const normalizedName = colorName.toLowerCase().trim()
    return colorTranslations[normalizedName] || colorName
}

export function translateColorNames(colorNames: string[]): string[] {
    return colorNames.map(translateColorName)
}
