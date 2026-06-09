<?php
/**
 * Template Name: Acceso JoathiVA
 *
 * @package packers_agency
 */

get_header();
set_query_var(
	'packers_agency_corporate_page',
	array(
		'eyebrow' => __( 'Acceso JoathiVA', 'packers-agency' ),
		'title'   => __( 'Ingreso controlado al panel operativo, CRM y asistente.', 'packers-agency' ),
		'intro'   => __( 'Usá este acceso para entrar a la herramienta interna según tu perfil y continuar con la tarea diaria sin perder trazabilidad.', 'packers-agency' ),
		'buttons' => array(
			array(
				'label' => __( 'Abrir JoathiVA', 'packers-agency' ),
				'url'   => home_url( '/v/' ),
				'class' => 'joathi-btn-primary',
			),
			array(
				'label' => __( 'Volver al inicio', 'packers-agency' ),
				'url'   => home_url( '/' ),
				'class' => 'joathi-btn-secondary',
			),
		),
		'cards'   => array(
			array(
				'eyebrow' => __( 'Dirección', 'packers-agency' ),
				'title'   => __( 'Visión total', 'packers-agency' ),
				'text'    => __( 'Acceso completo a indicadores, módulos y administración habilitada.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Operación', 'packers-agency' ),
				'title'   => __( 'Seguimiento diario', 'packers-agency' ),
				'text'    => __( 'Tareas, actividad y operaciones con foco en ejecución y control.', 'packers-agency' ),
			),
			array(
				'eyebrow' => __( 'Facturación', 'packers-agency' ),
				'title'   => __( 'Cobros y pagos', 'packers-agency' ),
				'text'    => __( 'Ingreso específico para facturación, cobro y seguimiento administrativo.', 'packers-agency' ),
			),
		),
		'steps'   => array(
			array(
				'step'  => '01',
				'title' => __( 'Login', 'packers-agency' ),
				'text'  => __( 'Ingresás con tu usuario asignado.', 'packers-agency' ),
			),
			array(
				'step'  => '02',
				'title' => __( 'Perfil', 'packers-agency' ),
				'text'  => __( 'La pantalla principal depende de tu rol y permisos.', 'packers-agency' ),
			),
			array(
				'step'  => '03',
				'title' => __( 'Trabajo', 'packers-agency' ),
				'text'  => __( 'CRM, agenda, operaciones y documentación quedan visibles según corresponda.', 'packers-agency' ),
			),
			array(
				'step'  => '04',
				'title' => __( 'Cierre', 'packers-agency' ),
				'text'  => __( 'Todo queda trazado y listo para revisión humana.', 'packers-agency' ),
			),
		),
		'cta'     => array(
			'eyebrow' => __( 'Portal', 'packers-agency' ),
			'title'   => __( 'El acceso operativo siempre queda a un clic.', 'packers-agency' ),
			'text'    => __( 'La web corporativa presenta la marca, pero el trabajo sucede en el portal operativo JoathiVA.', 'packers-agency' ),
			'buttons' => array(
				array(
					'label' => __( 'Ingresar a JoathiVA', 'packers-agency' ),
					'url'   => home_url( '/v/' ),
					'class' => 'joathi-btn-primary',
				),
			),
		),
	)
);
get_template_part( 'template-parts/corporate-page' );
get_footer();
