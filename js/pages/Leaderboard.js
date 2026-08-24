/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Calculates continuous exponential score where Rank 1 = 350 pts and Last Rank = 1 pt.
 * @param {Number} rank 1-based level rank (or AREDL rank)
 * @param {Number} percent Completion percentage
 * @param {Number} minPercent Minimum percentage required for progress points
 * @param {Number} [totalLevels=100] Total number of levels on the list
 * @returns {Number}
 */
export function score(rank, percent, minPercent = 100, totalLevels = 100) {
    if (percent < minPercent) {
        return 0;
    }

    const maxRank = Math.max(2, totalLevels);
    
    // Calculate decay factor k so Rank 1 = 350 and maxRank = 1.000
    const k = Math.log(350) / (maxRank - 1);
    
    // Continuous exponential decay formula
    const basePoints = 350 * Math.exp(-k * (rank - 1));

    // Handle partial progress runs
    let finalScore = basePoints;
    if (percent < 100) {
        const progressRatio = (percent - (minPercent - 1)) / (100 - (minPercent - 1));
        finalScore = basePoints * progressRatio;

        // Standard 1/3 point reduction penalty for non-100% runs
        finalScore = finalScore - (finalScore / 3);
    }

    return Math.max(0, round(finalScore));
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
