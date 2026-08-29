
        const canvas = document.getElementById('bg-canvas');
        const gl = canvas.getContext('webgl');

        const vertexShaderSrc = `
        attribute vec2 position;
        varying vec2 v_texCoord;
        void main() {
            v_texCoord = (position + 1.0) / 2.0;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

        const fragmentShaderSrc = `
        precision highp float;
        varying vec2 v_texCoord;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;
        uniform float u_isLight;

        void main() {
            vec2 uv = v_texCoord;
            vec2 mouse = u_mouse / u_resolution;
            
            vec3 darkColor1 = vec3(0.01, 0.04, 0.12);
            vec3 darkColor2 = vec3(0.03, 0.08, 0.22);

            vec3 lightColor1 = vec3(0.94, 0.96, 0.99);
            vec3 lightColor2 = vec3(0.90, 0.93, 0.98);

            vec3 color1 = mix(darkColor1, lightColor1, u_isLight);
            vec3 color2 = mix(darkColor2, lightColor2, u_isLight);
            
            float pulse = sin(u_time * 0.5) * 0.1 + 0.9;
            float dist = distance(uv, vec2(0.5) + (mouse - 0.5) * 0.1);
            vec3 finalColor = mix(color2, color1, smoothstep(0.2, 0.8, dist * pulse));
            
            float noise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
            finalColor += noise * 0.006;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

        function createShader(gl, type, source) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        }

        const program = gl.createProgram();
        gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc));
        gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc));
        gl.linkProgram(program);
        gl.useProgram(program);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        const positionLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        const timeLoc = gl.getUniformLocation(program, 'u_time');
        const resLoc = gl.getUniformLocation(program, 'u_resolution');
        const mouseLoc = gl.getUniformLocation(program, 'u_mouse');
        const isLightLoc = gl.getUniformLocation(program, 'u_isLight');

        let mouseX = 0, mouseY = 0;
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = canvas.height - e.clientY;
        });

        function renderBg(time) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);

            const isLight = document.documentElement.classList.contains('light') ? 1.0 : 0.0;

            gl.uniform1f(timeLoc, time * 0.001);
            gl.uniform2f(resLoc, canvas.width, canvas.height);
            gl.uniform2f(mouseLoc, mouseX, mouseY);
            gl.uniform1f(isLightLoc, isLight);

            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(renderBg);
        }
        requestAnimationFrame(renderBg);

        // Dashboard Entrance Animation & Dynamic Role UI
        document.addEventListener("DOMContentLoaded", () => {
            const role = localStorage.getItem('userRole') || 'admin';
            const name = localStorage.getItem('userName') || (role === 'admin' ? 'Admin' : 'Vendor');

            const authStatus = document.getElementById('auth-status');
            const authRole = document.getElementById('auth-role');
            const authIcon = document.getElementById('auth-icon');
            const entranceOverlay = document.getElementById('entrance-overlay');
            const mainContent = document.getElementById('main-content');

            // Update UI based on role
            if (role === 'admin') {
                authRole.textContent = "Executive Access Granted";
                authRole.className = "text-sm font-bold tracking-widest uppercase font-mono-data text-blue-400 opacity-0 transform translate-y-4";

                document.getElementById('header-avatar').textContent = name.substring(0, 2).toUpperCase();
                document.getElementById('header-avatar').className = "w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white font-mono-data";
                document.getElementById('header-name').textContent = name;

                document.getElementById('banner-badge-text').textContent = "System Executive Command";
                document.getElementById('welcome-message').innerHTML = `👋 Welcome back, ${name}!`;
                document.getElementById('welcome-subtext').textContent = "Manage vendors, monitor performance, identify procurement risks, and make smarter business decisions—all from one intelligent dashboard.";
            } else {
                authRole.textContent = "Vendor Partner Access Granted";
                authRole.className = "text-sm font-bold tracking-widest uppercase font-mono-data text-emerald-400 opacity-0 transform translate-y-4";

                document.getElementById('header-avatar').textContent = name.substring(0, 2).toUpperCase();
                document.getElementById('header-avatar').className = "w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white font-mono-data";
                document.getElementById('header-name').textContent = name;

                const badge = document.getElementById('banner-badge');
                badge.className = "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 light:bg-emerald-100 border border-emerald-500/20 text-emerald-400 light:text-emerald-700 text-xs font-mono-data font-bold uppercase tracking-wider";
                document.getElementById('banner-badge-text').textContent = "Vendor Partner Portal";

                document.getElementById('welcome-message').innerHTML = `👋 Welcome back, ${name}!`;
                document.getElementById('welcome-subtext').textContent = "View your performance metrics, manage active contracts, and maintain compliance with enterprise standards.";
            }

            // GSAP Entrance Animation Sequence
            if (typeof gsap !== 'undefined') {
                const tl = gsap.timeline();

                tl.to({}, { duration: 0.8 });
                tl.call(() => {
                    authStatus.textContent = "ACCESS GRANTED";
                    authStatus.classList.add(role === 'admin' ? 'text-blue-400' : 'text-emerald-400');
                    authIcon.textContent = "lock_open";
                    authIcon.classList.add(role === 'admin' ? 'text-blue-400' : 'text-emerald-400');
                });
                tl.to(authRole, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
                tl.to({}, { duration: 0.6 });
                tl.to(entranceOverlay, {
                    opacity: 0, duration: 0.5, ease: "power2.inOut",
                    onComplete: () => {
                        entranceOverlay.style.display = 'none';
                        document.body.classList.remove('overflow-hidden');

                        // Initialize VanillaTilt on Glass Widgets after overlay is gone
                        if (typeof VanillaTilt !== 'undefined') {
                            VanillaTilt.init(document.querySelectorAll(".glass-widget"), {
                                max: 12,
                                speed: 400,
                                glare: true,
                                "max-glare": 0.2,
                                scale: 1.02
                            });
                        }
                    }
                });

                tl.to(mainContent, { opacity: 1, duration: 0.1 });
                tl.from("main > section", {
                    y: 50,
                    opacity: 0,
                    rotationX: -10,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: "elastic.out(1, 0.75)",
                    clearProps: "all"
                }, "-=0.2");

                tl.from(".glass-widget", {
                    scale: 0.85,
                    opacity: 0,
                    y: 20,
                    duration: 0.6,
                    stagger: 0.05,
                    ease: "back.out(1.7)",
                    clearProps: "all"
                }, "-=0.6");
            } else {
                entranceOverlay.style.display = 'none';
                mainContent.style.opacity = '1';
                document.body.classList.remove('overflow-hidden');
            }
        });

        // Dark/Light Theme Switcher Logic
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const html = document.documentElement;

        themeToggle.addEventListener('click', () => {
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                html.classList.add('light');
                themeIcon.textContent = 'light_mode';
            } else {
                html.classList.remove('light');
                html.classList.add('dark');
                themeIcon.textContent = 'dark_mode';
            }
        });


        // Fetch Backend Data and Populate Dashboard
        async function loadDashboardData() {
            try {
                const response = await fetch('http://127.0.0.1:8000/api/vendors');
                if (!response.ok) throw new Error('Network response was not ok');
                const vendors = await response.json();

                // Calculate KPIs
                const totalVendors = vendors.length;
                const reliableVendors = vendors.filter(v => v.risk_level === 'Low' || v.status === 'Active').length;
                const highRiskVendors = vendors.filter(v => v.risk_level === 'High').length;
                // Assuming active contracts is a placeholder or calculated from status
                const activeContracts = vendors.filter(v => v.status === 'Active').length;

                const sumRating = vendors.reduce((sum, v) => sum + v.rating, 0);
                const avgRating = totalVendors ? (sumRating / totalVendors).toFixed(1) : "0.0";

                const sumDelivery = vendors.reduce((sum, v) => sum + v.delivery_rate, 0);
                const avgDelivery = totalVendors ? (sumDelivery / totalVendors).toFixed(1) : "0";

                // Update DOM
                document.getElementById('kpi-total-vendors').textContent = totalVendors;
                document.getElementById('kpi-reliable-vendors').textContent = reliableVendors;
                document.getElementById('kpi-high-risk').textContent = highRiskVendors;
                document.getElementById('kpi-active-contracts').textContent = activeContracts;
                document.getElementById('kpi-avg-rating').textContent = `${avgRating} / 5`;
                document.getElementById('kpi-ontime-delivery').textContent = `${avgDelivery}%`;

                // Populate Top Vendors Table
                const sortedVendors = [...vendors].sort((a, b) => b.rating - a.rating).slice(0, 5);
                const tbody = document.getElementById('top-vendors-body');
                tbody.innerHTML = ''; // clear loading state

                sortedVendors.forEach((vendor, index) => {
                    const rankLabels = ["🥇 1", "🥈 2", "🥉 3", "4", "5"];
                    const rank = rankLabels[index] || (index + 1);

                    let statusBadge = '';
                    if (vendor.rating >= 4.7) {
                        statusBadge = '<span class="px-2.5 py-1 rounded-full font-mono-data text-[10px] bg-emerald-500/20 text-emerald-300 light:text-emerald-800 font-bold border border-emerald-500/30">Excellent</span>';
                    } else if (vendor.rating >= 4.0) {
                        statusBadge = '<span class="px-2.5 py-1 rounded-full font-mono-data text-[10px] bg-blue-500/20 text-blue-300 light:text-blue-800 font-bold border border-blue-500/30">Good</span>';
                    } else {
                        statusBadge = '<span class="px-2.5 py-1 rounded-full font-mono-data text-[10px] bg-amber-500/20 text-amber-300 light:text-amber-800 font-bold border border-amber-500/30">Average</span>';
                    }

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-white/5 light:hover:bg-slate-50 transition-colors";
                    tr.innerHTML = `
                    <td class="p-3.5 font-bold text-base">${rank}</td>
                    <td class="p-3.5 font-bold text-white dark:text-white light:text-slate-900">${vendor.company_name}</td>
                    <td class="p-3.5 font-mono-data font-bold text-amber-400 light:text-amber-600 text-sm">⭐ ${vendor.rating.toFixed(1)}</td>
                    <td class="p-3.5">${statusBadge}</td>
                `;
                    tbody.appendChild(tr);
                });
            } catch (error) {
                console.error('Error fetching vendors:', error);
                // Fallback UI or silent error
            }
        }

        // Load data when DOM is ready
        document.addEventListener('DOMContentLoaded', loadDashboardData);

        // --- Modal Logic ---

        // Add Vendor Modal
        function openAddVendorModal() {
            document.getElementById('add-vendor-modal').classList.remove('hidden');
        }
        function closeAddVendorModal() {
            document.getElementById('add-vendor-modal').classList.add('hidden');
        }

        async function submitAddVendor(event) {
            event.preventDefault();
            const companyName = document.getElementById('add-company-name').value;
            const email = document.getElementById('add-email').value;
            const status = document.getElementById('add-status').value;
            const riskLevel = document.getElementById('add-risk').value;
            const rating = parseFloat(document.getElementById('add-rating').value) || 0;
            const deliveryRate = parseFloat(document.getElementById('add-delivery').value) || 100;
            const qualityScore = parseFloat(document.getElementById('add-quality').value) || 100;

            // Retrieve auth token
            const token = localStorage.getItem('accessToken');

            try {
                const response = await fetch('http://127.0.0.1:8000/api/vendors', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        company_name: companyName,
                        contact_email: email,
                        approval_status: status,
                        risk_level: riskLevel,
                        rating: rating,
                        delivery_rate: deliveryRate,
                        quality_score: qualityScore
                    })
                });

                if (response.ok) {
                    closeAddVendorModal();
                    event.target.reset();
                    loadDashboardData(); // Refresh the dashboard KPIs
                } else {
                    alert("Failed to add vendor.");
                }
            } catch (error) {
                console.error(error);
                alert("Error connecting to server.");
            }
        }

        // Manage Vendors Modal
        async function openManageVendorsModal() {
            const modal = document.getElementById('manage-vendors-modal');
            modal.classList.remove('hidden');

            try {
                const response = await fetch('http://127.0.0.1:8000/api/vendors');
                const vendors = await response.json();
                const tbody = document.getElementById('all-vendors-tbody');
                tbody.innerHTML = '';

                vendors.forEach(v => {
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-white/5 light:hover:bg-slate-50 transition-colors border-b border-white/5 light:border-slate-200 text-sm";

                    let actions = '';
                    if (v.approval_status === 'Pending') {
                        actions = `
                        <button onclick="updateVendorStatus(${v.id}, 'Approved')" class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40 mr-1 text-xs font-bold">Approve</button>
                        <button onclick="updateVendorStatus(${v.id}, 'Rejected')" class="px-2 py-1 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/40 mr-1 text-xs font-bold">Reject</button>
                    `;
                    }
                    actions += `<button onclick="deleteVendor(${v.id})" class="px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 text-xs font-bold">Delete</button>`;

                    tr.innerHTML = `
                    <td class="p-3 font-bold">${v.company_name}</td>
                    <td class="p-3">${v.category || 'N/A'}</td>
                    <td class="p-3">${v.contact_email}</td>
                    <td class="p-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${v.approval_status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            v.approval_status === 'Rejected' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-amber-500/20 text-amber-400'
                        }">
                            ${v.approval_status}
                        </span>
                    </td>
                    <td class="p-3">${v.risk_level}</td>
                    <td class="p-3">⭐ ${v.rating.toFixed(1)}</td>
                    <td class="p-3">${actions}</td>
                `;
                    tbody.appendChild(tr);
                });
            } catch (error) {
                console.error("Error fetching all vendors:", error);
            }
        }

        async function updateVendorStatus(vendorId, newStatus) {
            const token = localStorage.getItem('accessToken');
            try {
                const response = await fetch(`http://127.0.0.1:8000/api/vendors/${vendorId}/status`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ approval_status: newStatus })
            });
            if (response.ok) {
                openManageVendorsModal(); // refresh the list
                loadDashboardData(); // refresh KPI and top list
            } else {
                alert('Failed to update status');
            }
        } catch (e) {
            console.error('Error updating status', e);
        }
    }

    async function deleteVendor(vendorId) {
        if (!confirm("Are you sure you want to delete this vendor and all associated records?")) return;
        const token = localStorage.getItem('accessToken');
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/vendors/${vendorId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                openManageVendorsModal();
                loadDashboardData();
            } else {
                alert('Failed to delete vendor');
            }
        } catch (e) {
            console.error('Error deleting vendor', e);
        }
    }

    function closeManageVendorsModal() {
        document.getElementById('manage-vendors-modal').classList.add('hidden');
    }