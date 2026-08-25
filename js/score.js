/**
 * Calculates continuous exponential score where Rank 1 = 350 pts and Last Rank = 1 pt.
 * @param {Number} rank 1-based level rank
 * @param {Number} percent Completion percentage
 * @param {Number} minPercent Minimum percentage required for progress points
 * @param {Number} [totalLevels=100] Total number of levels on the list
 * @returns {Number}
 */
export function score(rank, percent, minPercent = 100, totalLevels = 100) {
    // If percent doesn't reach the required minimum, award 0
    if (percent < minPercent) {
        return 0;
    }

    const maxRank = Math.max(2, totalLevels);
    
    // Decay factor k so Rank 1 = 350 and maxRank = 1.000
    const k = Math.log(350) / (maxRank - 1);
    const basePoints = 350 * Math.exp(-k * (rank - 1));

    if (percent === 100) {
        return Math.max(0, round(basePoints));
    }

    // Scale progress smoothly based on percentage achieved
    let progressScore = basePoints * (percent / 100);

    // Apply standard 1/3 progress reduction penalty
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
