<?php
/**
 * Template Name: Quiénes somos
 *
 * @package packers_agency
 */

get_header();
set_query_var(
	'packers_agency_corporate_page',
	array(
		'eyebrow' => __( 'Quiénes somos', 'packers-agency' ),
		'title'   => __( 'JoathiLogística une operación, seguimiento y respuesta en una misma experiencia.', 'packers-agency' ),
		'intro'   => __( 'Somos una base operativa pensada para carga, documentación y trazabilidad, con una marca clara y un acceso directo al trabajo diario en JoathiVA.', 'packers-agency' ),
		'buttons' => array(
			array(
				'label' => __( 'Ingresar a JoathiVA', 'packers-agency' ),
				'url'   => home_url( '/v/' ),
				'class' => 'joathi-btn-primary',
			),
			array(
				'label' => __( 'Ver servicios', 'packers-agency' ),
				'url'   => home_url( '/servicios/' ),
				'class' => 'joathi-btn-secondary',
			),
		),
		'cards'   => array(
			array(
				'eyebrow' => __( 'Misión', 'packers-agency' ),
				'title'   => __( 'Orden operativo', 'packers-agency' ),
				'text'    => __( 'Reducir fricción en la gestión diaria con una interfaz clara para clientes, operaciones y documentación.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Visión', 'packers-agency' ),
				'title'   => __( 'Trazabilidad real', 'packers-agency' ),
				'text'    => __( 'Cada correo, tarea, actividad y operación debe quedar vinculada a un caso verificable.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Marca', 'packers-agency' ),
				'title'   => __( 'Identidad Joathi', 'packers-agency' ),
				'text'    => __( 'Verde, amarillo y blanco como lenguaje visual de confianza, energía y claridad.', 'packers-agency' ),
			),
		),
		'points'  => array(
			'eyebrow' => __( 'Lo que hacemos', 'packers-agency' ),
			'title'   => __( 'Operamos con foco diario', 'packers-agency' ),
			'items'   => array(
				__( 'Seguimiento comercial con continuidad.', 'packers-agency' ),
				__( 'Gestión documental y control de hitos.', 'packers-agency' ),
				__( 'Asistente operativo con drafts y trazabilidad.', 'packers-agency' ),
				__( 'Acceso por perfil para cada función interna.', 'packers-agency' ),
			),
		),
		'cta'     => array(
			'eyebrow' => __( 'Conectar', 'packers-agency' ),
			'title'   => __( 'Llevá a tu equipo al trabajo operativo real.', 'packers-agency' ),
			'text'    => __( 'Desde esta base corporativa podés entrar al portal operativo y continuar con CRM, agenda y operaciones.', 'packers-agency' ),
			'buttons' => array(
				array(
					'label' => __( 'JoathiVA', 'packers-agency' ),
					'url'   => home_url( '/v/' ),
					'class' => 'joathi-btn-primary',
				),
				array(
					'label' => __( 'Contacto', 'packers-agency' ),
					'url'   => home_url( '/#contacto' ),
					'class' => 'joathi-btn-secondary',
				),
			),
		),
	)
);
get_template_part( 'template-parts/corporate-page' );
get_footer();
