# -*- coding: utf-8 -*-
import json
import re

raw_data = """JABREU Abreu Pardo, Jose Antonio

!

AACOS Acosta Martín, Aaron

!

DAACO Acosta Pacheco, Daniel

!

PAFON Afonso Martinez, Paula Simonetta

!

Aguilar López, Carlos

!

JALBA Alba Ríos, Jorge

!

OVIDI Alejandro, Ovidio Antonio

!

NALON Alonso Castro, Nerea

!

HALON Alonso Díaz, Himar

!

JGUTI Alonso Gutierrez, Jorge

!

MAAAL Álvarez Afonso, Miguel Ángel

!

RALVA Álvarez De León , Rubén

!

AALVE Alves Schormann, Anderson Flavio

!

RAMBR Ambrosoli Abreu, Ricardo Francisco

!

AKOIT Andre, Koitz

!

Andujar Alvaro, Marco Antonio

!

LANSO Ansoleaga Tejera, Laura

!

LANTO Anton, Leonard Florian

!

AAREV Arevalo, Arturo

!

LARTE Arteaga Darias, Luis Fernando

!

SOREN Arweson, Sören

!

Arzola, David

!

Ashford, Robert Peter David

!

IASSI Assi, Ivomir

!

JAVIL Avila Rios, Juan Francisco

!

LAYAL Ayala López, Luis Ángel

!

JAZCA Azcárate, Jesús

!

Aznar Pinto, Luis Miguel

!

DBAEZ Báez, Dácil Carmen

!

ZBAEZ Baez Suarez, Zebensui

!

ABARB Barbero Pareja, Alfonso

!

SBARO Baron, Stefan

!

JABAR Barrett, James Peter

!

JBARR Barrios Fuentes, Joel

!

BELIO Barthelemy, Eliot

!

Basic, Domen

!

Bayley, Dean

!

Becker, Nadin

!

Bellido Stein, Héctor Abel

!

JBENE Beneyto Gomez De Barreda, Jaime Ignacio

!

Bermúdez Bethencourt, Andrew

!

OBETA Betancor Gonzalez, Oliver

!

DBICH Bichtemann, Dennis

!

ABLANC Blanco López, Armando

!

SPBLUE Blue, Safety Pilot

!

BTM Blue Team , Flight School

!

RBOET Boettcher, Robert

!

Bohnacker, Ulrich

!

Borghetto, Simone

!

JBORG Borgman, John Björn Kim

!

Borrego Gasane, Jose Maria

!

Bos, Joannes

!

TBRAN Brandt, Torben

!

CBRAU Braun, Christopher

!

JBRIC Briceño Medina, Jesús Manuel

!

AYOZE Brito, Ayoze Manuel

!

JANBR Brunner, Joanis Jan

!

MBTM Btm, Marian

!

BBUEN Bueno, Blanca

!

EBUGA Bugakova, Elena

!

RBUKE Bukenas, Remighius

!

BFERG Byrne, Fergal

!

Caban, Grzegorz

!

JCABO Cabot, Jordi

!

ACABR Cabrera Díaz, Alejandro

!

ROCAB Cabrera Fajardo, Roberto Vidal

!

Cabrera Hernández, Leire

!

MMART Cabrera Martín, Manuel José

!

ECABR Cabrera Rodríguez, Eduardo

!

JCABR Cabrera Suarez, Javier

!

Cairós Padilla, Jairo

!

ECALS Cal, Eudaldo Alvaro

!

FCALZ Calzadilla Rodriguez, Francisco Jose

!

DCAMA Camacho Chacón, David

!

ACAMI Camiruaga Manso, Aitor

!

Cano Cabezudo, Enrique

!

GCANT Cantero Medialdea, Guillermo

!

ACARB Carballo, Andrés

!

MCARD Cardarelli, Matteo

!

SCARD Cardinal Pereyra, Santiago Sebastian

!

SOCAR Cardosi, Sofia

!

Carnicero Pastor, Maria

!

ACARO Caro Concepcion, Angel

!

PHILI Carrington, Philip James

!

Carro Sabina, Javier

!

RCASA Casado Sánchez, Rafael

!

Castañeda Vigara, Ernesto

!

LCAST Castaño Delgado, Luis

!

SCAST Castellano Martinez, Santiago

!

Castillo Leal , Leiry Laura

!

MCAST Castosa De La Fuente Amor, Miguel

!

ACAST Castro Menendez, Angel

!

Caus Mihalache, Roberto

!

MCEDRO Cedronski, Michal Stanislaw

!

DCERD Cerdán García, David

!

Chesnut, John

!

TANIA Chico Gonzalez, Tania Marlem

!

MCLIN Clinckemaillie, Mathias

!

ACOLE Coleman, Alexander

!

Cológan Galván, Javier

!

RCONG Congia, Roberto

!

Corbella Pardo, Carmen

!

Corbella Tena, Miguel Virgilio

!

ACORR Correas Olivares, Antonio

!

MCOTT Cotter Nuñez, Miguel Angel

!

Coulthard, Tom

!

Cruz Cabrera, Maria Candelaria

!

Cruz Diaz, Onan

!

Cuesta Caño, Vicente

!

RCUSH Cushnahan, Ronan

!

RCUTI Cutillas Gomez, Roberto

!

MDASI Da Silva Madalena, Marco Antonio

!

CDABB Dabbene, Celina Denis

!

Danielson, Lee Martin

!

Daparte López, Erik

!

ADORT David Dorta, Abush

!

De Abreu Pardo, Juan Carlos

!

HELDER De Azevedo Alves, Helder Antonio

!

De Castro Cruz, Francisco José

!

JACOP De Cesare, Jacopo

!

ARAMR De La Rosa Santana, Aram

!

ABDEL De Leon Gonzalez, Abora Cel

!

ADELE De Leon Perez, Jose Andrew

!

CVALE De Valenzuela Pérez Cuadrado, Cesar

!

Dekmock, Julie

!

Del Pino Perez, Jacinto Amado

!

CRIO Del Rio Seoane, Cristina

!

Delgado Escobar, Víctor Martín

!

ADIPA Di Paolo, Alessio

!

ADIAZ Diaz Deswelgh, Apeles

!

CDIAZ Diaz Luis, Cesar

!

Diáz Monzón, Thiago

!

Diaz Navarro, Joaquin

!

Diaz Pérez, Carlos

!

PDIAZ Díaz Pilar, Pablo

!

Diaz Ramos, Guillermo

!

RDIEG Dieguez Torrico, Rafael

!

Dimitrenko, Egor

!

Dolinsky, Jiri

!

MIDOM Dominguez Felipe, Miguel Angel

!

ADOMI Domínguez González, Antonio Jesús

!

EDOMI Domínguez González, Eduardo José

!

Domínguez Hernández, Oliver

!

JDOMI Dominguez Perez, Javier

!

MDOMI Domínguez Pérez, Miguel Ángel

!

ODONI Doniz, Oliver

!

Doran, Sinead

!

Dorrington, Patrick Alexander

!

JDORT Dorta Castañeda, Javier Alfonso

!

CDUAN Duane, Conor

!

Dzenis, Uldis

!

TEARL Earle, Tomas

!

Eatwell, Barry

!

TECKA Eckardt, Thomas

!

TZARE El Zared Khalifa, Tawfiq

!

FESCO Escobar, Jose Fernando

!

EESTE Estévez Herrera, Eduardo

!

MESTU Estupiñan Milan, Manuel

!

MEUGE Eugenio Ringham, Maximilio Enrique

!

DAFAY Fay, Darragh Brian

!

GIULI Feliciani, Giulia

!

Fernández Acosta, Josue

!

DFERN Fernandez Blanco, David

!

JFERN Fernández García, Javier

!

GOICO Fernández Goicoechea, Pedro María

!

AFERR Ferrer Ramírez, Ana

!

AFFC Ffc, Alumno

!

KAMIL Figura, Kamila

!

CFILE Filesari González, Cesar Augusto

!

Fini, Federico

!

LUKEM Fixter, Luke Michael

!

RFRANC Franchi, Rodolf Jacques Oreste

!

FFRES Fresneda Gómez, Fabio

!

AFUEN Fuentes Rodríguez, Adrián

!

JFURT Furtado Velo, Jonathan

!

RGALA Galán, Rafael

!

Galindo Afonso, Airam Xerach

!

SGALV Galviz Gobea, José Saul

!

Gando, Gando

!

MESQU Garcia, Maria

!

JGALV García Álvarez, Javier

!

Garcia Armas, Raul Antonio

!

OGARC García Callejo, Óliver

!

García Carrasco, Iván

!

RGARC García Fernandez, Roberto

!

IGARC García Fernández, Ivan

!

SGARC García González, Sebastian

!

García Hernández, Karim

!

Garcia King, Kevin

!

LGARC Garcia Martinez, Luis

!

JAGAR García Martinez, Javier

!

JGARC García Peña, Jonathan

!

Garcia Quiros, Rodrigo

!

AGARC García Rodríguez, Agustín Miguel

!

García Socas, Romen

!

García Tayupo, Humberto

!

García Torrens, Juan Antonio

!

GALDO Gargiulo, Aldo Paolo

!

EGARZ Garzón, Estefanía

!

AGASA Gasalla Glumb, Alejandro

!

Gascon, Maria Eugenia

!

SGAVI Gavin, Sean

!

Gaviño Overbeek, Ramona Cecilia

!

LGAWL Gawle, Lukasz Jan

!

OGIAN Gianoli Michelón, Omar

!

Gilarranz Gomez, Lucio Alejandro

!

Giornelli, Nicolo

!

UNAVA Gisladottir, Una Valgerdur

!

Gloux, Sylvain

!

AGOME Gómez, Alejandro

!

FMIRA Gómez, Francisco Javier

!

RGOME Gomez Agueda, Roman Alexis

!

ALEND Gómez Lende, Ana

!

Gómez Medina, Jesús Francisco

!

CRUIZ Gómez Ruiz, Carlos

!

CLAVA Gonzalez, Pablo

!

DUNA González, Duna

!

MARIA González Argomaniz, Mariano

!

González Cánovas, Domingo

!

PCHAV González De Chaves Fernández, Pablo

!

Gonzalez Garcia, Alberto

!

MGONZ González García, Miriam

!

González González, Alejandro

!

González González, Antonio

!

González González, Eladio

!

González González, Ignacio

!

JGONZ González González, Jesús

!

PGONZ González León, Pablo

!

Gonzalez Marrero, Marco Antonio

!

LGONZ Gonzalez Martin, Lucio

!

AGONZ Gonzalez Martinez, Alvaro

!

AGONZA González Ortiz, Alejandro

!

González Pimentel, Juan José

!

APROH González Prohaska, Alejandro Gabriel

!

González Rodríguez, Yessen

!

Gonzalez Sanchez, Francisco

!

SGONZ González Suárez, Samuel

!

NGONZ Gonzalez Van Den Bosch, Noel Enrique

!

Goryanets, Olexandr

!

Goy, Gavin Walter

!

MARIU Grabowski, Mariusz

!

Grimaldi, Riccardo

!

Groppelli, Maddalena

!

GROUPON Groupon, Groupon

!

Guanche Darias, Benjamin

!

JGUAR Guarddon Ledbetter, Julian Drew Carlos

!

RGUEIM Gueimonde Bautista, Rodrigo

!

AGUER Guerra Artiles, Alejandro Efrain

!

OGUHL Guhl, Oliver Philip

!

JGUZM Guzman Nuez, Francisco Javier

!

MHAAS Haase Rivero, Michael

!

HEOIN Hahesy, Eoin

!

JHAHN Hahn Hernández, Juan Carlos

!

Hallin, Per Einar

!

EHALT Halton, Elicia

!

HANGAR Hangar, Hangar

!

Havlicek, Jiri

!

JHAYW Hayward, Jonathan Richard Alexande

!

Heimpel, Peter

!

Heredía Rodríguez, Ulises

!

DTKI Hernández, Daniela Tki

!

VHERN Hernández Arizaga, Vanessa

!

Hernández Baute, Fernando

!

Hernández Cano, Carlos

!

NCANO Hernández Cano, Ignacio

!

CDAMI Hernández Castillo, Christian Damian

!

Hernández Delgado, Epifanio Jesús

!

Hernandez Dorta, Alexis

!

JFARI Hernández Fariña, Jesús

!

SFERN Hernández Fernández, Silvia

!

JHERN Hernández Hernández, Joseba

!

EHERN Hernández Hernández-abad, Eduardo

!

Hernández Lopez, Sergio

!

NHERN Hernández Machin, Nereida

!

Hernández Marrero, Jonathan

!

DHERN Hernandez Martin, Daniela

!

CHERN Hernández Ortega, Carlos

!

AHERN Hernandez Velazquez, Ayoze

!

DHERR Herrera Bissoli, Diego

!

AHERR Herrera Diaz, Alejandro

!

JHERR Herrero Martínez, Juan Antonio

!

JHICK Hickey, Jack

!

IHIDA Hidalgo Garrido, Ignacio Francisco

!

Higham, Jonathan

!

VHORO Horobet, Vasile-catalin

!

Hughes, Isaac

!

LHURT Hurtado Fernández-oliva, Luciana

!

MHURT Hurtado Sáez, Mario

!

Indirizzi, Luca

!

CIZAG Izaguirre Pascual, Cayetana

!

Jaswani Mahtani, Vikesh

!

MJATI Játiva Carrión, Máximo

!

MJERO Jeronimo, Mercedes

!

Jimenez Camarena, Javier

!

DEBOR Jorge, Debora

!

AJORG Jorge Soler, Adrián

!

MJOSA Josa Scheel, Mateo

!

Kaplowitz, Zachary

!

DKAVA Kavassy, Daniel Kristof

!

Kell, Bernadette

!

AKENE Kennedy, Aine Bridget

!

DKENN Kennedy, Damien

!

LKEOH Keohane, Liam Patrick

!

SKILD Kilders Díaz, Sascha

!

JKILL Killahena, Jonathan Patrick

!

Kirrane, Martin

!

STANI Klajban, Stanislav

!

IKONI Konieczek, Irmina Magdalena

!

PAVLO Kovalchuk, Pavlo

!

MKRAM Kramer, Maximilian

!

CKRUG Kruger, Carsten Ulf

!

GLASE La Serna Afonso, Gustavo

!

Lamberti González, Juan Miguel

!

BLAND Landeros Sanchez, Brian Ever

!

SLARA Lara González, Samuel

!

ILARR Larraya González, Iñigo

!

ALASO Lason, Alexander Adam

!

KSHON Laurent, Kevin Shon

!

RALAWL Lawlor, Robert

!

Lehnert, Gerd Bernhard

!

MLEIT Leite Oliveira, Marcos Paulo

!

Lemes Arteaga, Jonathan Jesus

!

DLEON Leon Rosario, Damaso

!

Leon Suárez, Mario

!

NLIET Lietz, Nora

!

Llanos Guillermo, Oliver

!

LJOSE Llanos López, Leonardo José

!

BLLOY Lloyd, Brett Trevor

!

Longuinos Santos Rodríguez, José

!

López, Ezequiel

!

Lopez Armas, Ignacio

!

Lopez Esclapez, José Manuel

!

Lopez García, Miguel

!

López Kashaev, Daniel Felipe

!

HLORE Lorenzo Álvarez, Héctor

!

LUGGE Lugger, Bjorn-christoph

!

Luis Delgado, Gustavo

!

ELUNG Lungu, Eleonora

!

TLYNC Lynch, Tara

!

MLYON Lyons, Michael Francis

!

GMACA Macaulay, George

!

Machín Martín, Alberto

!

Macías Ojeda, Antonio Manuel

!

CMACR Macresy Estevan, Catherine Anne

!

KUMAR Mahboobani, Kumar Divesh

!

Manchon Aguirre, Gaston

!

IMANT Mantesa Diaz, Ivan

!

IALVA Marcelo Álvarez, Ian Daniel

!

AMARI Marichal, Angel Luciano

!

VMARI Marichal, Verónica Esmeralda

!

SMAR Marichal Baez, Sergio

!

Marichal Otero, Efrain

!

MMARI Marin, Manuel

!

JMARQ Marquez Díaz, Jaime

!

MMARR Marrero Avila, Mario

!

Marrero Rodríguez , Andrés Eduardo

!

Martin Alonso, Adrian

!

MCABR Martin Cabrera, Mauro

!

NCORD Martin Cordoba, Natalia

!

Martin Martin, Genaro

!

CMART Martin Tesan, Carmelo Agustin

!

RMART Martín-peñasco Capote, Raúl Anselmo

!

Martinez De La Puente Azcarate, Asier

!

GMART Martinez Esteve, Georgina

!

JMART Martinez Mantolan, Javier

!

EMASC Mascarell Cardelle, Eduardo

!

SMATT Mattar Guadagno, Suleiman

!

Mayoral Gutierrez, Felix Jonay

!

TMCCA Mc Carville, Tiarnán Sean

!

MGRAT Mcgrath, Megan Ciara

!

HMEDI Medina Morales, Hugo

!

Medina Pérez, Ana Isabel

!

Melián García, Juan Miguel

!

AMENA Mena Sánchez, Alejandro

!

MMENE Meneghetti, Maurizio

!

OMESA Mesa González, Óscar

!

Mezcua Aldeano, Asier

!

AMILL Milla, Ayran

!

VMILO Milosavljevic, Vladimir

!

Mist Baldursdóttir, Lara

!

GMODZ Modzelewski, Grzegorz

!

OMONT Montenegro Falcón, Ovidio

!

RAIM Montero Perez, Raimundo

!

Montes Mosteiro, David

!

Montesino Alayon, Francisco Javier

!

OMONZ Monzon, Oliver

!

MMORA Morales, Marcos Manuel

!

CFEBE Morales Febles, Carlos Jesús

!

Moreno González, Ivan Carmelo

!

Morera De Paz, Alberto

!

Moya Martinez, Maria Belen

!

Muriel Sánchez, Freddy

!

MNANG Nangia, Michel

!

CNARO Narozni, Cheherazade

!

GNAUG Naughton, Gary

!

INAVA Navarro De Corcuera, Ignacio

!

KONST Nazarow-nenno, Konstanty

!

ENAZA Nazarow-nenno, Eugeniusz

!

VACLA Nekvapil, Vaclav

!

Nemes, Lucian Victor

!

FNIEL Nielsen Gerdo, Fabian Eduardo

!

Nilgen, Fabian

!

Nowak, Michal Lukasz

!

Nuñez Garcia, Rubén

!

CFLAH O´flaherty, Conor

!

BOMOR O´mordha, Breandan

!

DOROU O´rourke, Darragh John

!

Obergfoell, Holger

!

AOBER Obermaier, Alfred Johann

!

SOLIV Oliva Cabrera, Saul

!

COLIV Oliva García, Carlos

!

GOLIV Olivares Pérez, Guayarmina

!

POLON Olóndriz, Pablo

!

Osado Pérez, Daniel

!

Oskarsson, Viktor Emil

!

VPADI Padilla Vega, Víctor

!

YPADR Padrón Abreu, Yanelys

!

HPANC Pancorbo, Hector Demetrio

!

Parker, James

!

CPARD Pastó García, Cristina

!

Paulin Duncan, Calvin

!

APEMO Peña Monzón, Alejandro Javier

!

MMORE Peña Moreno, Manuel

!

MPEÑA Peña Padilla, Miguel

!

Pepito, Pepito

!

MPERA Peraita García, Marcos Javier

!

CPERA Perales García, Carolina

!

IBERR Peralta Berrocal, Ivan

!

Perdomo, Miguel Ángel

!

Perera Pellegrino, Tobias Noel

!

VTKI Pérez, Vidal Tki

!

Perez Arranz, Ignacio

!

Pérez Cabrera, Raimundo

!

JCORB Perez Corbella, Javier

!

Pérez Flores, Jonay Zebensui

!

APERE Perez Hernandez, Anthony

!

DPERE Perez Hernandez, Diego

!

Pérez Hernandez, Juan Vidal

!

FHERN Pérez Hernández, Francisco Agustín

!

CPERE Pérez Medina, Carlos

!

JPERE Perez Ortega, Javier

!

KPEDR Perez Pedrianes, Kevin

!

OPERE Perez Perez, Oscar

!

VPERE Perez Perez, Vidal

!

Pérez Plasencia, Francisco Manuel

!

Pete Sanudo, Gala

!

Peterka, Jiri

!

GPIJO Pijoan Viñas, Genís

!

DPINO Pino Perez, Daniel Jesus

!

APITE Pitera Muriel, Antonio

!

MPLAS Plasencia Hodgkinson, Marcos

!

Pollet, Felix

!

TPREN Prentoulis, Tzon Betoven

!

DPROT Protasoni, Dino Alexander

!

JPUJO Pujol Alvarez, Juan Miguel

!

QIAO Qiao, Dongping

!

PRABA Rabah Nelson, Paul Geoffrey Nassim

!

PRAMI Ramírez Afonso, Patricia

!

CMORA Ramón Morales, Carlos

!

ARAMO Ramos Garcia, Adrian

!

DRAMO Ramos Hernández, Daniel

!

Ramos Hernández, Sergio

!

Ramos Mendoza, Juan Jesús

!

Ramos Rodriguez, Richard

!

Reyes Hernandez, Carmen

!

Reyes Lopez, Alicia

!

MREYE Reyes Martinez, Miguel

!

Rhyner, Kurt

!

Rios Londoño, Esteban

!

ERIVE Rivera Leon, Enrique Manuel

!

Rivero Gonzalez, Sara

!

Robayna Montañez, Alejandro

!

AROCE Roces Alvarez, Alfredo

!

TRODR Rodríguez, Tomás

!

ARODR Rodríguez Álvarez, Airán

!

AADRI Rodríguez Álvarez, Álvaro Adrián

!

Rodriguez Fernandenz, Diego

!

FRODR Rodríguez Glaría, Franco

!

Rodríguez Martín, Alvaro

!

NRODR Rodríguez Martín, Néstor

!

Rodriguez Perez, Gabriel

!

Rodríguez Rodríguez, Eligio

!

Rodriguez Salas, Manuel

!

MRODR Rodríguez Vargas, Marta

!

JROJA Rojano Feriz, Johan

!

PROMA Romanovs, Pavels

!

YULI Romanyshyn Skaletska, Yuliya

!

GROMB Rombaut, Guy

!

MROME Romero Martínez, Miguel

!

MROSA Rosario García, Marta

!

GROSE Rosendo Negrin, Genesis Nicole

!

LROSS Ross, Lorenzo Tobias

!

AROST Rostro Buide, Alejandro

!

CRUBI Rubiano, Carlos Gustavo

!

YRUIZ Ruiz Calle, Yeray

!

Rutolo Cendon, Juan Carlos

!

Saeys, Ruth Godelieve

!

FSALA Sala, Federico

!

San Blas Camacho, Rosario Heredia

!

San Martin Padilla, Daniel

!

Sanchez Dominguez, Jesus

!

MSANC Sanchez I Fontrodona, Marc

!

JSANC Sánchez Naranjo, Jeanine

!

Sánchez Rodríguez, Eva María

!

Sandoval Romero, Alexmar Naomi

!

ASANT Santana, Anabel

!

Santana Cabello, Sonia

!

GSANT Santana Castellano, Gabriel

!

Santana Rosa, Jorge

!

DSANT Santos, David

!

ASCHI Schirmer, Andreas

!

TSCHO Schroeder, Tino

!

Schuette, Zen

!

Schwab, Axel

!

PSEDL Sedlacek, Pavel

!

Segura Ponce, Roque Daniel

!

Selytska, Tetiana

!

MSEMA Semacoy Albertini, Maxence

!

LSIER Sierra Perdomo, Luis Alberto

!

TSIVE Siverio Siverio, Tania

!

Skifte, Hans Ulrik

!

Skridlevskiy, Ilya

!

Sloane, Nicholas Thomas

!

ALEKS Smirnov, Aleksei

!

TSNALL Snall, Tomas Kai Kristian

!

Sosa Peter, Cristian Sebastian

!

FSTAN Stangl, Florian Ricardo

!

DSTEH Stehmann, Dirk Hans

!

Stevenson, David

!

ASUAR Suarez Perez, Angel

!

Suárez Reyes, Aday Francisco

!

Suero Mena, Javier

!

ESURI Suria Martin, Eduardo

!

VIKTO Svetlichnyi, Viktor

!

Szabolcs, Denes

!

JARNO Talponen, Jarno Olavi

!

MTAPI Tapia González, Jose Miguel

!

ABISA Tapia Marrero, Abisai Gilbert

!

Tavio Bonilla, Jacinto René

!

Tki, Fiabisai

!

ABETH Tki. Bethencourt Paz, Alejandro

!

Toledo Ramos, Santiago

!

MARCI Tomaszewski, Marcin Mariusz

!

Torres González, Alexander

!

JTRUJ Trujillo, Jesús Enrique

!

JKEVI Trujillo Rodríguez, Juan Kevin

!

Tunstall, Edwin

!

Ugolin, Michela

!

AUMPI Umpiérrez Suárez, Ángel David

!

HVAND Van Der Sluis, Hendrick

!

Van Marrewijk, Roy Robertus Cornelis

!

MVARG Vargas Sanchez, Marina

!

Varger Perez, Bryan Antonio

!

CVARL Varley, Connor David

!

FVAZH Vaz Hernandez, Francisco Agustin

!

Vazquez Gomez, Claudio

!

SVEGA Vega, Serafín

!

Velasco Dujo, David

!

SVENE Venero Rodriguez, Sara

!

Verkest, Bert

!

Verlinden, Pierre

!

JOSEF Verner, Josef

!

YVICE Vicente Pérez, Yolanda

!

Vicenti, Giorgia Annalisa

!

JCAST Vilar Castro, Jorge

!

JVILA Vilar García-talavera, Jorge Manuel

!

DVILL Villalgordo González, Daniel

!

CVILL Villamizar Navarro, Carlos Mauricio

!

MVILL Villarroya Medina, Marco

!

SVILL Villegas Londoño, Santiago

!

JVILL Villen Rodriguez, José Miguel

!

Vincenzi, Gianluca

!

TVOSE Vosen, Thomas

!

Vyncke, Eric

!

DWADE Wade Montesdeoca, Daniel Paul

!

JEROM Warnimont, Jerome

!

CWATN Watney Ramírez, Carlos Santiago

!

Watson, Tara

!

ISAWE Welsch, Isabel Carolina

!

PWESS Wessel, Paul

!

GWHEL Whelan, Graham Paul

!

Wuestenhagen, Rainer

!

AYANE Yanes Sritharach, Aimon

!

JZAMO Zamora Ruiz, Jesús

!

JZANA Zanasi, Jacopo

!

LZARA Zarabozo, Lester

!

ZYURY Zaytsev, Yury

!

KEVIN Ziegler, Kevin

!

Zouaghi, Anissa

!

PAWEL Zysk, Pawel"""

def parse():
    chunks = [c.strip() for c in raw_data.split('!') if c.strip()]
    parsed = []
    for c in chunks:
        # Regex to detect code:
        # Look for leading uppercase word of length 2 to 7 letters, followed by a space and rest of the name
        # Examples of codes: JABREU, AACOS, SOREN, ABLANC, SPBLUE, BTM, CVALE, RGUEIM, AADRI, KEVIN, PAWEL, DEBOR, SBARO, etc.
        # But if the first word contains lowercase letters or comma or accents, it's not a code.
        # What about 'O´flaherty, Conor'? First word is O´flaherty (has lowercase).
        # What about 'Blue Team'? BTM is code, Blue is name.
        m = re.match(r'^([A-Z0-9Ñ]{2,7})\s+(.+)$', c)
        if m:
            code = m.group(1)
            name = m.group(2).strip()
            parsed.append({"code": code, "name": name})
        else:
            parsed.append({"code": "", "name": c.strip()})
    
    print(f"Total entries: {len(parsed)}")
    with_code = [p for p in parsed if p["code"]]
    without_code = [p for p in parsed if not p["code"]]
    print(f"With code: {len(with_code)}, Without code: {len(without_code)}")
    
    # Save to alumnos.json
    with open('alumnos.json', 'w', encoding='utf-8') as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)
    print("Saved to alumnos.json")

if __name__ == '__main__':
    parse()
