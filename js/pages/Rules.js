import { store } from "../main.js";

export default {
    template: `
        <main class="page-rules" style="display: flex; justify-content: center; padding: 2.5rem 1rem; width: 100%;">
            <div style="width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 1.5rem;">
                
                <div style="margin-bottom: 0.5rem;">
                    <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 0.4rem; color: inherit;">Submission Rules</h1>
                    <p class="type-label-lg" style="opacity: 0.75; font-size: 1.05rem; color: inherit;">
                        Please review all requirements carefully before submitting a record to the Syrian Demon List.
                    </p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                    
                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">1</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">You MUST be Syrian or of Syrian descent.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">2</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">Achieved the record without using hacks (however, FPS bypass is allowed).</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">3</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">Achieved the record on the level that is listed on the site - please check the level ID before you submit a record.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">4</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">Have either source audio or clicks/taps in the video. Edited audio only does not count.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">5</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">6</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">The recording must also show the player hit the endwall, or the completion will be invalidated.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">7</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">Do not use secret routes or bug routes.</p>
                    </div>

                    <div :style="{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        padding: '1.1rem 1.25rem',
                        background: store.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        border: store.dark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px'
                    }">
                        <span style="background: #b9a779; color: #002623; min-width: 28px; height: 28px; border-radius: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0;">8</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5; font-size: 1rem; color: inherit;">Do not use easy modes, only a record of the unmodified level qualifies.</p>
                    </div>

                </div>
            </div>
        </main>
    `,
    data: () => ({ store }),
    mounted() {
        document.title = 'Submission Rules';
    }
};