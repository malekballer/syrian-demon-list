/**
 * Numbers of decimal digits to round to
 */
const scale = 3;

/**
 * Calculates continuous exponential score where Rank 1 = 350 pts and Last Rank = 1 pt.
 * @param {Number} rank 1-based level rank
 * @param {Number} percent Completion percentage
 * @param {Number} minPercent Minimum percentage required for progress points
 * @param {Number} [totalLevels=100] Total number of levels on the list
 * @returns {Number}
 */
export function score(rank, percent, minPercent = 0, totalLevels = 100) {
    const maxRank = Math.max(2, totalLevels);
    
    // Exponential decay factor k so Rank 1 = 350.000 and maxRank = 1.000
    const k = Math.log(350) / (maxRank - 1);
    const basePoints = 350 * Math.exp(-k * (rank - 1));

    if (percent >= 100) {
        return Math.max(0, round(basePoints));
    }

    // Smoothly scale progress points based on percent achieved
    let progressScore = basePoints * (percent / 100);

    // Apply standard 1/3 penalty for non-100% completions
    progressScore = progressScore - (progressScore / 3);

    return Math.max(0, round(progressScore));
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
