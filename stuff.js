function doTheThing(THREE, container) {
    function sphere(radius, segments, material) {
        var rings = segments;

        return new THREE.Mesh(
            new THREE.SphereGeometry(radius, segments, rings),
            material
        );

    }

    function light(colour, x, y, z) {
        var pointLight = new THREE.PointLight(colour);
        pointLight.position.x = x;
        pointLight.position.y = y;
        pointLight.position.z = z;
        return pointLight;
    }

    function material(colour, opacity) {
        var opaque = opacity || 1.0;
        return new THREE.MeshPhongMaterial({
            color: colour,
            opacity: opaque,
            transparent: opaque < 1.0 ? true : false
        });
    }

    function lightSphere(size, segments, colour) {
        return sphere(size, segments, material(colour));
    }

    function lumpySphere(size, segments, lumpiness, colour, lightPosition) {
        var attributes =
            {
                displacement: {
                    type: "f",
                    value: []
                }
            },
        sphereColour = new THREE.Color(colour),
        lumpyMaterial = new THREE.MeshShaderMaterial(
            {
                uniforms: {
                    colour: {
                        type: "c",
                        value: sphereColour
                    },
                    lightPosition: {
                        type: "v3",
                        value: lightPosition
                    }
                },
                attributes: attributes,
                vertexShader: document.getElementById("vertexShader").textContent,
                fragmentShader: document.getElementById("fragmentShader").textContent
            }),
            smooth = sphere(size, segments, lumpyMaterial);

        smooth.geometry.vertices.forEach(function (vertex) {
            attributes.displacement.value.push(random(lumpiness));
        });

        return smooth;
    }

    function coronaMaterial(clock, colour1, colour2, lightPosition) {
        var uniforms = {
            time: {
                type: "f",
                value: 0.0025
            },
            colour1: {
                type: "c",
                value: new THREE.Color(colour1)
            },
            colour2: {
                type: "c",
                value: new THREE.Color(colour2)
            },
            lightPosition: {
                type: "v3",
                value: lightPosition
            }
        },
        material = new THREE.MeshShaderMaterial({
            transparent: true,
            uniforms: uniforms,
            vertexShader: document.getElementById("coronaVertex").textContent,
            fragmentShader: document.getElementById("coronaFragment").textContent
        });

        clock.listen(function() {
            uniforms.time.value += 0.0025;
        });

        return material;
    }

    function turbulentMaterial(clock, colour1, colour2, lightPosition) {
        var uniforms = {
            time: {
                type: "f",
                value: 0.0025
            },
            thingColour1: {
                type: "c",
                value: new THREE.Color(colour1)
            },
            thingColour2: {
                type: "c",
                value: new THREE.Color(colour2)
            },
            useLight: {
                type: "i",
                value: lightPosition ? 1 : 0
            },
            lightPosition: {
                type: "v3",
                value: lightPosition
            }
        },
        material = new THREE.MeshShaderMaterial(
            {
                uniforms: uniforms,
                vertexShader: document.getElementById("turbulenceVertex").textContent,
                fragmentShader: document.getElementById("turbulenceFragment").textContent
            }
        );
        clock.listen(function() {
            uniforms.time.value += 0.0025;
        });
        return material;
    }


    function random(scale) {
        return (Math.random() * scale) - (scale/2);
    }

    function randomVector(maximum, minimum) {
        var x = random(maximum - minimum),
            y = random(maximum - minimum),
            z = random(maximum - minimum),
        origin = new THREE.Vector3(0,0,0),
            vector = new THREE.Vector3(x, y, z),
            magnitude = vector.distanceTo(origin);

        vector.setLength(magnitude + minimum);

        return vector;
    }

    function particles(numParticles) {
        var things = new THREE.Geometry(),
        material = new THREE.ParticleBasicMaterial({
            color: 0xffffff,
            size: 20,
            map: THREE.ImageUtils.loadTexture("particle.png"),
            blending: THREE.AdditiveBlending,
            transparent: true
        }),
            i,
            vector,
            system;

        for (i = 0; i < numParticles; i += 1) {
            vector = randomVector(1000, 100);
            things.vertices.push(new THREE.Vertex(vector));
        }

        system = new THREE.ParticleSystem(things, material);
        system.sortParticles = true;

        return system;
    }

    function orbit(clock, origin, satellite, distance, period) {
        clock.listen(function() {
            //will orbit in the x-z plane
            //first work out the current angle between the origin and the satellite
            var dz = satellite.position.z - origin.position.z,
                dx = satellite.position.x - origin.position.x,
                theta = Math.atan2(dz, dx);
            //add a bit to theta
            theta += 2 * Math.PI / (period * 60);
            //work out the new position
            satellite.position.z = origin.position.z + (distance * Math.sin(theta));
            satellite.position.x = origin.position.x + (distance * Math.cos(theta));
        });
    }

    function render() {
        renderer.render(scene, camera);
    }

    function animate() {
        requestAnimationFrame(animate);
        render();
    }

    function Clock(frequency) {
        var that = this, frequency = frequency || 10;
        this.listeners = [];
        setInterval(function() {
            that.listeners.forEach(function(listener) {
                listener();
            });
        }, frequency);
    }

    Clock.prototype.listen = function(listener) {
        this.listeners.push(listener);
    };

    var width = container.clientWidth,
        height = container.clientHeight,
        viewAngle = 45,
        aspect = width / height,
        near = 0.1,
        far = 10000,
        renderer = new THREE.WebGLRenderer(),
        //camera = new THREE.Camera(viewAngle, aspect, near, far),
    camera = new THREE.FlyCamera({

			fov: viewAngle,
			aspect: aspect,
			movementSpeed: 50,
			domElement: container,
			rollSpeed: Math.PI / 24,
			autoForward: false,
			dragToLook: false,
			near: near,
			far: far

        }),
        scene = new THREE.Scene(),
        clock = new Clock(),
        pointLight = light(0xffffff, 15, 100, 150),
        sunPosition = new THREE.Vector3(0,0,0),
        sun = sphere(50, 16, turbulentMaterial(clock, 0xff6600, 0xff3300, pointLight.position)),
        corona = sphere(52, 32, coronaMaterial(clock, 0xffff00, 0xff9900, pointLight.position)),
        planet = sphere(20, 32, turbulentMaterial(clock, 0x6666ff, 0xffffff, pointLight.position)),
        moon = lumpySphere(10, 32, 1, 0xaaaaaa, pointLight.position),
        stars = particles(1000);

    camera.position.z = 300;
    camera.position.x = -100;
    camera.position.y = 50;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    scene.addChild(sun);
    scene.addChild(corona);
    scene.addChild(planet);
    scene.addChild(moon);
    scene.addChild(stars);
    scene.addLight(pointLight);

    orbit(clock, sun, planet, 150, 20);
    orbit(clock, planet, moon, 50, 2);
    clock.listen(function() {
        stars.rotation.y -= 0.001;
    });

    animate();
}
