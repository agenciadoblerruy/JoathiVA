<?php
/**
 * Template Name: Servicios
 *
 * @package packers_agency
 */

get_header();
set_query_var(
	'packers_agency_corporate_page',
	array(
		'eyebrow' => __( 'Servicios', 'packers-agency' ),
		'title'   => __( 'Servicios logísticos y operativos con foco en continuidad y control.', 'packers-agency' ),
		'intro'   => __( 'La propuesta de JoathiLogística combina atención comercial, control documental y soporte operativo para flujos diarios y especiales.', 'packers-agency' ),
		'buttons' => array(
			array(
				'label' => __( 'Ver operativa', 'packers-agency' ),
				'url'   => home_url( '/operativa/' ),
				'class' => 'joathi-btn-primary',
			),
			array(
				'label' => __( 'Hablar con nosotros', 'packers-agency' ),
				'url'   => home_url( '/#contacto' ),
				'class' => 'joathi-btn-secondary',
			),
		),
		'cards'   => array(
			array(
				'eyebrow' => __( 'Transporte', 'packers-agency' ),
				'title'   => __( 'Coordinación de cargas', 'packers-agency' ),
				'text'    => __( 'Seguimiento de traslados, arribos y coordinación de ventanas operativas con foco en cumplimiento.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Documentación', 'packers-agency' ),
				'title'   => __( 'Paquetes listos para revisión', 'packers-agency' ),
				'text'    => __( 'Factura, DUA, CRT, MIC, adendas y soportes preparados para enviar o archivar.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Seguimiento', 'packers-agency' ),
				'title'   => __( 'Estado y prioridades', 'packers-agency' ),
				'text'    => __( 'Visibilidad de tareas, operaciones y próximos pasos con trazabilidad diaria.', 'packers-agency' ),
			),
		),
		'steps'   => array(
			array(
				'step'  => '01',
				'title' => __( 'Ingreso', 'packers-agency' ),
				'text'  => __( 'Recibimos la solicitud o correo y lo asociamos al caso correcto.', 'packers-agency' ),
			),
			array(
				'step'  => '02',
				'title' => __( 'Control', 'packers-agency' ),
				'text'  => __( 'Validamos documentación, fechas, hitos y pendientes.', 'packers-agency' ),
			),
			array(
				'step'  => '03',
				'title' => __( 'Ejecución', 'packers-agency' ),
				'text'  => __( 'Activamos la operación o la tarea correspondiente según el contexto.', 'packers-agency' ),
			),
			array(
				'step'  => '04',
				'title' => __( 'Cierre', 'packers-agency' ),
				'text'  => __( 'Dejamos trazabilidad, draft o archivo final según aplique.', 'packers-agency' ),
			),
		),
		'cta'     => array(
			'eyebrow' => __( 'Acceso', 'packers-agency' ),
			'title'   => __( 'Con JoathiVA el equipo trabaja sobre la misma información.', 'packers-agency' ),
			'text'    => __( 'El portal operativo concentra CRM, agenda y operaciones para que el sitio comercial y el trabajo diario convivan sin fricción.', 'packers-agency' ),
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
