import { store } from "../main.js";

export default {
    template: `
        <main class="page-rules" style="max-width: 900px; margin: 2rem auto; padding: 0 1.5rem;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 2rem;">
                <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem;">Submission Rules</h1>
                <p style="opacity: 0.7; margin-bottom: 1.5rem;">Please review all criteria before submitting a completion to the list.</p>
                
                <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem;" />

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">1</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">Achieved the record without using hacks (however, FPS bypass is allowed).</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">2</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">Achieved the record on the level that is listed on the site - please check the level ID before you submit a record.</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">3</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">Have either source audio or clicks/taps in the video. Edited audio only does not count.</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">4</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this.</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">5</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">The recording must also show the player hit the endwall, or the completion will be invalidated.</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">6</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">Do not use secret routes or bug routes.</p>
                    </div>

                    <div style="display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;">
                        <span style="background: #007A3D; color: #fff; padding: 0.2rem 0.6rem; border-radius: 6px; font-weight: bold; font-size: 0.85rem;">7</span>
                        <p class="type-label-lg" style="margin: 0; line-height: 1.5;">Do not use easy modes, only a record of the unmodified level qualifies.</p>
                    </div>
                </div>
            </div>
        </main>
    `,
    data: () => ({ store })
};
