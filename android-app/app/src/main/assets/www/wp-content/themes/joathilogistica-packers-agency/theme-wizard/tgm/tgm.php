<?php require get_template_directory() . '/theme-wizard/tgm/class-tgm-plugin-activation.php';

function packers_agency_register_recommended_plugins() {
	$plugins = array(
		array(
			'name'             => __( 'Woocommerce', 'packers-agency' ),
			'slug'             => 'woocommerce',
			'required'         => false,
			'force_activation' => false,
		),
		array(
			'name'             => __( 'Classic Widgets', 'packers-agency' ),
			'slug'             => 'classic-widgets',
			'source'           => '',
			'required'         => false,
			'force_activation' => false,
		),
		array(
			'name'             => __( 'Contact Form 7', 'packers-agency' ),
			'slug'             => 'contact-form-7',
			'source'           => '',
			'required'         => false,
			'force_activation' => false,
		),
	);
	$config = array();
	tgmpa( $plugins, $config );
}
add_action( 'tgmpa_register', 'packers_agency_register_recommended_plugins' );