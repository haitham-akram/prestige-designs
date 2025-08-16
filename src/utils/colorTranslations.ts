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

// Generate customized product label
export const getCustomLabel = (customizations?: any) => {
    console.log('🔍 getCustomLabel called with:', customizations);

    if (!customizations) {
        console.log('❌ No customizations provided');
        return null;
    }

    // Check if there are any customizations
    const hasCustomizations =
        (customizations.colors && customizations.colors.length > 0) ||
        (customizations.text && Object.keys(customizations.text).length > 0) ||
        (customizations.textChanges && customizations.textChanges.length > 0) ||
        (customizations.uploads && Object.keys(customizations.uploads).length > 0) ||
        (customizations.uploadedImages && customizations.uploadedImages.length > 0) ||
        (customizations.customizationNotes && customizations.customizationNotes.trim().length > 0);

    console.log('🔍 hasCustomizations:', hasCustomizations);

    if (!hasCustomizations) {
        console.log('❌ No valid customizations found');
        return null;
    }

    // If there are color customizations, show specific color label
    if (customizations.colors && customizations.colors.length > 0) {
        const colorNames = customizations.colors.map((color: any) =>
            translateColorName(color.name || color)
        );
        console.log('✅ Returning color label:', `مخصص بلون ${colorNames.join(', ')}`);
        return `مخصص بلون ${colorNames.join(', ')}`;
    }

    // For other types of customizations
    console.log('✅ Returning generic custom label');
    return 'مخصص';
};
