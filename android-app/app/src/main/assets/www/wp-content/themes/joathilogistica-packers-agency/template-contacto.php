<?php
/**
 * Template Name: Contacto
 *
 * @package packers_agency
 */

get_header();
set_query_var(
	'packers_agency_corporate_page',
	array(
		'eyebrow' => __( 'Contacto', 'packers-agency' ),
		'title'   => __( 'Canal de contacto claro para clientes, proveedores y equipo interno.', 'packers-agency' ),
		'intro'   => __( 'Dejá visible el punto de contacto institucional y mantené el acceso operativo a JoathiVA como puerta principal de trabajo.', 'packers-agency' ),
		'buttons' => array(
			array(
				'label' => __( 'Ingresar a JoathiVA', 'packers-agency' ),
				'url'   => home_url( '/v/' ),
				'class' => 'joathi-btn-primary',
			),
		),
		'cards'   => array(
			array(
				'eyebrow' => __( 'Correo', 'packers-agency' ),
				'title'   => __( 'contacto@joathilogistica.com.uy', 'packers-agency' ),
				'text'    => __( 'Canal institucional sugerido para consultas generales.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Atención', 'packers-agency' ),
				'title'   => __( 'Seguimiento operativo', 'packers-agency' ),
				'text'    => __( 'Consultas sobre carga, documentación y estado de casos en curso.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Acceso', 'packers-agency' ),
				'title'   => __( 'JoathiVA', 'packers-agency' ),
				'text'    => __( 'Portal de CRM, agenda, operaciones y asistente operativo.', 'packers-agency' ),
			),
		),
		'points'  => array(
			'eyebrow' => __( 'Usos', 'packers-agency' ),
			'title'   => __( 'El contacto se ordena por tipo de solicitud', 'packers-agency' ),
			'items'   => array(
				__( 'Clientes: cotizaciones, servicios y seguimiento.', 'packers-agency' ),
				__( 'Proveedores: facturación, documentación y coordinación.', 'packers-agency' ),
				__( 'Equipo interno: acceso operativo y control diario.', 'packers-agency' ),
			),
		),
		'cta'     => array(
			'eyebrow' => __( 'Acción rápida', 'packers-agency' ),
			'title'   => __( 'El trabajo real sigue en JoathiVA.', 'packers-agency' ),
			'text'    => __( 'El sitio institucional presenta y deriva; el trabajo diario vive en el portal operativo.', 'packers-agency' ),
			'buttons' => array(
				array(
					'label' => __( 'Ir al portal', 'packers-agency' ),
					'url'   => home_url( '/v/' ),
					'class' => 'joathi-btn-primary',
				),
			),
		),
	)
);
get_template_part( 'template-parts/corporate-page' );
get_footer();
